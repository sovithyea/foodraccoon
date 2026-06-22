import Link from "next/link";
import { notFound } from "next/navigation";
import { Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { PublicProfileFollow } from "@/components/profile/PublicProfileFollow";

const AVATAR_COLORS = ["#D44C2A", "#3A7A5C", "#2C5A8A", "#8A4A2C"];
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function relativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7)  return `${days} days ago`;
  if (days < 14) return "1 week ago";
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  // get_caller_identity
  const { data: { user: caller } } = await supabase.auth.getUser();

  // get_profile_by_username
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, city, followers_count, following_count")
    .eq("username", username)
    .maybeSingle();

  if (!profile) notFound();

  // redirect own profile to /profile
  // (still renders — just a UX note; no hard redirect needed)

  let isFollowing = false;
  if (caller && caller.id !== profile.id) {
    // check_follow_edge
    const { data: edge } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", caller.id)
      .eq("following_id", profile.id)
      .maybeSingle();
    isFollowing = edge !== null;
  }

  // get_public_lists_for_user
  const { data: listsRaw } = await supabase
    .from("lists")
    .select("id, title, emoji, slug, list_restaurants(count)")
    .eq("user_id", profile.id)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  const lists = (listsRaw ?? []).map((l) => ({
    id: l.id,
    title: l.title,
    emoji: l.emoji,
    slug: l.slug as string | null,
    restaurant_count: Array.isArray(l.list_restaurants)
      ? (l.list_restaurants[0] as { count: number } | undefined)?.count ?? 0
      : 0,
  }));

  // get_recent_public_ratings
  const { data: ratings } = await supabase
    .from("user_restaurants")
    .select("rating, visited_at, updated_at, restaurants(name)")
    .eq("user_id", profile.id)
    .eq("is_public", true)
    .not("rating", "is", null)
    .order("updated_at", { ascending: false })
    .limit(10);

  const displayName = profile.display_name ?? profile.username ?? "User";
  const initials = displayName.slice(0, 2).toUpperCase();
  const color = avatarColor(displayName);
  const isSelf = caller?.id === profile.id;

  return (
    <div className="mx-auto h-full max-w-lg overflow-y-auto px-6 py-10 pb-20 md:pb-10">

      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-3 text-center">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={displayName}
            className="size-20 rounded-full object-cover"
            style={{ boxShadow: `0 0 0 3.5px #EDE6D8, 0 0 0 6px #D44C2A` }}
          />
        ) : (
          <div
            className="flex size-20 items-center justify-center rounded-full text-2xl font-bold text-white"
            style={{ backgroundColor: color, boxShadow: `0 0 0 3.5px #EDE6D8, 0 0 0 6px ${color}` }}
          >
            {initials}
          </div>
        )}

        <div>
          <h1 className="text-xl font-semibold text-[#2C2420]">{displayName}</h1>
          <p className="text-sm text-[#8C7E72]">
            @{profile.username} · {profile.city ?? "Phnom Penh"}
          </p>
        </div>

        {profile.bio && <p className="text-sm text-[#5A4E48]">{profile.bio}</p>}

        {!isSelf && (
          <PublicProfileFollow
            username={username}
            isLoggedIn={!!caller}
            initialIsFollowing={isFollowing}
            followersCount={profile.followers_count}
            followingCount={profile.following_count}
          />
        )}

        {isSelf && (
          <Link
            href="/profile"
            className="rounded-full border border-[#D4C8B4] px-5 py-1.5 text-sm font-medium text-[#8C7E72] transition-colors hover:bg-[#EDE6D8]"
          >
            Edit profile
          </Link>
        )}
      </div>

      {/* Public lists */}
      {lists.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#8C7E72]">
            Lists
          </h2>
          <div className="flex flex-col gap-2">
            {lists.map((list) => (
              <Link
                key={list.id}
                href={list.slug ? `/u/${username}/${list.slug}` : `/lists/${list.id}`}
                className="flex items-center gap-3 rounded-2xl border border-[#D4C8B4] bg-[#EDE6D8] px-4 py-3.5 transition-colors hover:bg-[#E2D9C8]"
              >
                <span className="text-2xl leading-none">{list.emoji ?? "📋"}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#2C2420]">{list.title}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-[#8C7E72]">
                    {list.restaurant_count} {list.restaurant_count === 1 ? "place" : "places"}
                    {" · "}
                    <Globe className="inline size-3" /> Public
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent ratings */}
      {ratings && ratings.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#8C7E72]">
            Recent Ratings
          </h2>
          <div className="flex flex-col gap-2">
            {ratings.map((row, i) => {
              const restaurant = Array.isArray(row.restaurants)
                ? row.restaurants[0]
                : row.restaurants;
              const date = row.visited_at ?? row.updated_at;
              const score = row.rating as number;
              return (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-[#D4C8B4] bg-[#EDE6D8] px-4 py-3"
                >
                  <span className="text-sm font-medium text-[#2C2420]">
                    {restaurant?.name ?? "Unknown"}
                  </span>
                  <div className="flex items-center gap-3 text-sm text-[#8C7E72]">
                    {date && <span>{relativeDate(date)}</span>}
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-bold",
                        score >= 8.5
                          ? "bg-[#D44C2A] text-white"
                          : "border border-[#D4C8B4] bg-[#F5F0E8] text-[#2C2420]",
                      )}
                    >
                      {score}/10
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
