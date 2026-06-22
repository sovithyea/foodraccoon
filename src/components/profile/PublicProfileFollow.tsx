"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";

type Props = {
  username: string;
  isLoggedIn: boolean;
  initialIsFollowing: boolean;
  followersCount: number;
  followingCount: number;
};

export function PublicProfileFollow({
  username,
  isLoggedIn,
  initialIsFollowing,
  followersCount,
  followingCount,
}: Props) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);
  const [sheet, setSheet] = useState<"followers" | "following" | null>(null);

  async function toggleFollow() {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    setLoading(true);
    const method = isFollowing ? "DELETE" : "POST";
    const res = await fetch(`/api/users/${username}/follow`, { method });
    if (res.ok) setIsFollowing((v) => !v);
    setLoading(false);
  }

  return (
    <>
      {/* Followers / Following counts */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => setSheet("followers")}
          className="flex flex-col items-center gap-0.5 transition-opacity hover:opacity-70"
        >
          <span className="text-lg font-semibold text-[#2C2420]">{followersCount}</span>
          <span className="text-xs text-[#8C7E72]">Followers</span>
        </button>
        <button
          onClick={() => setSheet("following")}
          className="flex flex-col items-center gap-0.5 transition-opacity hover:opacity-70"
        >
          <span className="text-lg font-semibold text-[#2C2420]">{followingCount}</span>
          <span className="text-xs text-[#8C7E72]">Following</span>
        </button>
      </div>

      {/* Follow / Unfollow */}
      <button
        onClick={toggleFollow}
        disabled={loading}
        className={
          isFollowing
            ? "rounded-full border border-[#D4C8B4] bg-[#EDE6D8] px-6 py-2 text-sm font-semibold text-[#2C2420] transition-all hover:bg-[#D4C8B4] disabled:opacity-60"
            : "rounded-full bg-[#D44C2A] px-6 py-2 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(212,76,42,0.25)] transition-all hover:bg-[#B83D1E] disabled:opacity-60"
        }
      >
        {loading ? "…" : isFollowing ? "Following" : "Follow"}
      </button>

      {/* Followers sheet — stub */}
      <Sheet open={sheet === "followers"} onOpenChange={(o) => !o && setSheet(null)}>
        <SheetContent side="bottom" className="bg-[#F5F0E8] pb-safe">
          <SheetHeader>
            <SheetTitle className="text-[#2C2420]">Followers</SheetTitle>
          </SheetHeader>
          <p className="px-4 pb-6 text-sm text-[#8C7E72]">Coming soon.</p>
        </SheetContent>
      </Sheet>

      {/* Following sheet — stub */}
      <Sheet open={sheet === "following"} onOpenChange={(o) => !o && setSheet(null)}>
        <SheetContent side="bottom" className="bg-[#F5F0E8] pb-safe">
          <SheetHeader>
            <SheetTitle className="text-[#2C2420]">Following</SheetTitle>
          </SheetHeader>
          <p className="px-4 pb-6 text-sm text-[#8C7E72]">Coming soon.</p>
        </SheetContent>
      </Sheet>
    </>
  );
}
