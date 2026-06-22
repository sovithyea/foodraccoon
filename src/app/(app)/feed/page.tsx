import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FeedList, mapRows } from "@/components/feed/FeedList";

export default async function FeedPage() {
  const supabase = await createClient();

  // get_caller_identity
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="max-w-xs space-y-4">
          <p className="text-2xl font-bold text-[#2C2420]">Your feed</p>
          <p className="text-sm text-[#8C7E72]">Sign in to see what people you follow are eating.</p>
          <Link
            href="/login"
            className="inline-block rounded-xl bg-[#D44C2A] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(212,76,42,0.25)] transition-all hover:bg-[#B83D1E]"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  // get_following_ids
  const { data: followRows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);

  const followingIds = (followRows ?? []).map((r) => r.following_id);

  if (followingIds.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="max-w-xs space-y-4">
          <p className="text-2xl font-bold text-[#2C2420]">Your feed</p>
          <p className="text-sm text-[#8C7E72]">
            Follow people to see their restaurant activity here.
          </p>
          <Link
            href="/search"
            className="inline-block rounded-xl border border-[#D4C8B4] px-6 py-2.5 text-sm font-semibold text-[#2C2420] transition-all hover:bg-[#EDE6D8]"
          >
            Find people
          </Link>
        </div>
      </div>
    );
  }

  // get_initial_feed
  const { data: rows } = await supabase
    .from("user_restaurants")
    .select("id, status, rating, updated_at, restaurant_id, restaurants(id, name), profiles!user_id(username, display_name, avatar_url)")
    .in("user_id", followingIds)
    .eq("is_public", true)
    .order("updated_at", { ascending: false })
    .limit(20);

  const initialItems = mapRows(rows ?? []);

  return (
    <div className="mx-auto h-full max-w-lg overflow-y-auto px-4 py-6 pb-20 md:pb-6">
      <h1 className="mb-4 px-1 text-xl font-bold text-[#2C2420]">Feed</h1>

      {initialItems.length === 0 ? (
        <p className="px-1 text-sm text-[#8C7E72]">
          No activity yet — check back after the people you follow log some restaurants.
        </p>
      ) : (
        <FeedList initialItems={initialItems} followingIds={followingIds} />
      )}
    </div>
  );
}
