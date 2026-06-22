"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";

const AVATAR_COLORS = ["#D44C2A", "#3A7A5C", "#2C5A8A", "#8A4A2C"];
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

type ProfileRow = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  followers_count: number;
};

type Props = {
  username: string;
  isLoggedIn: boolean;
  initialIsFollowing: boolean;
  followersCount: number;
  followingCount: number;
};

const PAGE_SIZE = 20;

export function PublicProfileFollow({
  username,
  isLoggedIn,
  initialIsFollowing,
  followersCount,
  followingCount,
}: Props) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followLoading, setFollowLoading] = useState(false);

  const [sheet, setSheet] = useState<"followers" | "following" | null>(null);
  const [sheetUsers, setSheetUsers] = useState<ProfileRow[]>([]);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetHasMore, setSheetHasMore] = useState(false);
  const [sheetOffset, setSheetOffset] = useState(0);

  const openSheet = useCallback(async (kind: "followers" | "following") => {
    setSheet(kind);
    setSheetUsers([]);
    setSheetOffset(0);
    setSheetHasMore(false);
    setSheetLoading(true);
    const res = await fetch(`/api/users/${username}/${kind}?offset=0`);
    if (res.ok) {
      const { profiles, hasMore } = await res.json();
      setSheetUsers(profiles ?? []);
      setSheetHasMore(hasMore);
      setSheetOffset(PAGE_SIZE);
    }
    setSheetLoading(false);
  }, [username]);

  async function loadMoreSheet() {
    if (sheetLoading || !sheet) return;
    setSheetLoading(true);
    const res = await fetch(`/api/users/${username}/${sheet}?offset=${sheetOffset}`);
    if (res.ok) {
      const { profiles, hasMore } = await res.json();
      setSheetUsers((prev) => [...prev, ...(profiles ?? [])]);
      setSheetHasMore(hasMore);
      setSheetOffset((o) => o + PAGE_SIZE);
    }
    setSheetLoading(false);
  }

  async function toggleFollow() {
    if (!isLoggedIn) { router.push("/login"); return; }
    setFollowLoading(true);
    const res = await fetch(`/api/users/${username}/follow`, {
      method: isFollowing ? "DELETE" : "POST",
    });
    if (res.ok) {
      setIsFollowing((v) => !v);
      router.refresh();
    }
    setFollowLoading(false);
  }

  return (
    <>
      {/* Followers / Following counts */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => openSheet("followers")}
          className="flex flex-col items-center gap-0.5 transition-opacity hover:opacity-70"
        >
          <span className="text-lg font-semibold text-[#2C2420]">{followersCount}</span>
          <span className="text-xs text-[#8C7E72]">Followers</span>
        </button>
        <button
          onClick={() => openSheet("following")}
          className="flex flex-col items-center gap-0.5 transition-opacity hover:opacity-70"
        >
          <span className="text-lg font-semibold text-[#2C2420]">{followingCount}</span>
          <span className="text-xs text-[#8C7E72]">Following</span>
        </button>
      </div>

      {/* Follow / Unfollow */}
      <button
        onClick={toggleFollow}
        disabled={followLoading}
        className={
          isFollowing
            ? "rounded-full border border-[#D4C8B4] bg-[#EDE6D8] px-6 py-2 text-sm font-semibold text-[#2C2420] transition-all hover:bg-[#D4C8B4] disabled:opacity-60"
            : "rounded-full bg-[#D44C2A] px-6 py-2 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(212,76,42,0.25)] transition-all hover:bg-[#B83D1E] disabled:opacity-60"
        }
      >
        {followLoading ? "…" : isFollowing ? "Following" : "Follow"}
      </button>

      {/* Shared sheet */}
      <Sheet open={sheet !== null} onOpenChange={(o) => !o && setSheet(null)}>
        <SheetContent side="bottom" className="bg-[#F5F0E8] max-h-[70vh] overflow-y-auto">
          <SheetHeader className="border-b border-[#EDE6D8]">
            <SheetTitle className="text-[#2C2420]">
              {sheet === "followers" ? "Followers" : "Following"}
            </SheetTitle>
          </SheetHeader>

          <div className="px-4 py-2">
            {sheetLoading && sheetUsers.length === 0 && (
              <div className="space-y-3 py-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="size-9 rounded-full bg-[#EDE6D8]" />
                    <div className="h-4 w-32 rounded bg-[#EDE6D8]" />
                  </div>
                ))}
              </div>
            )}

            {!sheetLoading && sheetUsers.length === 0 && (
              <p className="py-6 text-center text-sm text-[#8C7E72]">No users yet.</p>
            )}

            {sheetUsers.map((p) => {
              const name = p.display_name ?? p.username;
              const initials = name.slice(0, 2).toUpperCase();
              const color = avatarColor(name);
              return (
                <Link
                  key={p.username}
                  href={`/u/${p.username}`}
                  onClick={() => setSheet(null)}
                  className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-[#EDE6D8]"
                >
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt={name} className="size-9 rounded-full object-cover" />
                  ) : (
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: color }}
                    >
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#2C2420]">{name}</p>
                    <p className="text-xs text-[#8C7E72]">@{p.username}</p>
                  </div>
                </Link>
              );
            })}

            {sheetHasMore && (
              <button
                onClick={loadMoreSheet}
                disabled={sheetLoading}
                className="mt-2 w-full rounded-xl border border-[#D4C8B4] py-2 text-sm text-[#8C7E72] transition-colors hover:bg-[#EDE6D8] disabled:opacity-50"
              >
                {sheetLoading ? "Loading…" : "Load more"}
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
