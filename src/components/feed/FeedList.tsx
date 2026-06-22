"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const AVATAR_COLORS = ["#D44C2A", "#3A7A5C", "#2C5A8A", "#8A4A2C"];
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function relativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  <  1) return "Just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  <  7) return `${days}d ago`;
  if (days  < 14) return "1 week ago";
  if (days  < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

const STATUS_LABEL: Record<string, string> = {
  visited:      "visited",
  want_to_try:  "wants to try",
  favourite:    "favourited",
};

export type FeedItem = {
  id: string;
  status: string;
  rating: number | null;
  updated_at: string;
  restaurant_id: string;
  restaurant_name: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

type Props = {
  initialItems: FeedItem[];
  followingIds: string[];
};

export function FeedList({ initialItems, followingIds }: Props) {
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [exhausted, setExhausted] = useState(initialItems.length < 20);

  async function loadMore() {
    if (loading || exhausted || items.length === 0) return;
    setLoading(true);
    const cursor = items[items.length - 1].updated_at;
    const supabase = createClient();

    const { data } = await supabase
      .from("user_restaurants")
      .select("id, status, rating, updated_at, restaurant_id, restaurants(id, name), profiles!user_id(username, display_name, avatar_url)")
      .in("user_id", followingIds)
      .eq("is_public", true)
      .lt("updated_at", cursor)
      .order("updated_at", { ascending: false })
      .limit(20);

    const next = mapRows(data ?? []);
    setItems((prev) => [...prev, ...next]);
    if (next.length < 20) setExhausted(true);
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <FeedCard key={item.id} item={item} />
      ))}

      {!exhausted && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="mt-2 w-full rounded-xl border border-[#D4C8B4] py-2.5 text-sm font-medium text-[#8C7E72] transition-colors hover:bg-[#EDE6D8] disabled:opacity-50"
        >
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}

function FeedCard({ item }: { item: FeedItem }) {
  const displayName = item.display_name ?? item.username;
  const initials = displayName.slice(0, 2).toUpperCase();
  const color = avatarColor(displayName);
  const label = STATUS_LABEL[item.status] ?? item.status;

  return (
    <Link
      href={`/restaurant/${item.restaurant_id}`}
      className="flex items-start gap-3 rounded-2xl border border-[#D4C8B4] bg-[#EDE6D8] px-4 py-3.5 transition-colors hover:bg-[#E2D9C8]"
    >
      {/* Avatar */}
      {item.avatar_url ? (
        <img
          src={item.avatar_url}
          alt={displayName}
          width={36}
          height={36}
          className="size-9 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {initials}
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[#2C2420]">
          <span className="font-semibold">@{item.username}</span>
          {" "}{label}{" "}
          <span className="font-semibold">{item.restaurant_name}</span>
        </p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs text-[#8C7E72]">{relativeDate(item.updated_at)}</span>
          {item.rating != null && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-bold",
                item.rating >= 8.5
                  ? "bg-[#D44C2A] text-white"
                  : "border border-[#D4C8B4] bg-[#F5F0E8] text-[#2C2420]",
              )}
            >
              {item.rating}/10
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapRows(rows: any[]): FeedItem[] {
  return rows.map((r) => {
    const restaurant = Array.isArray(r.restaurants) ? r.restaurants[0] : r.restaurants;
    const profile    = Array.isArray(r.profiles)    ? r.profiles[0]    : r.profiles;
    return {
      id:              r.id,
      status:          r.status,
      rating:          r.rating,
      updated_at:      r.updated_at,
      restaurant_id:   restaurant?.id   ?? r.restaurant_id,
      restaurant_name: restaurant?.name ?? "Unknown",
      username:        profile?.username     ?? "unknown",
      display_name:    profile?.display_name ?? null,
      avatar_url:      profile?.avatar_url   ?? null,
    };
  });
}
