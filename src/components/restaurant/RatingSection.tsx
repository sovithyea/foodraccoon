"use client";

import { useState } from "react";
import { Bookmark, Check, Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMapStore, type RestaurantStatus } from "@/store/mapStore";
import { useAuthModal } from "@/hooks/useAuthModal";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  {
    value: "want_to_try" as RestaurantStatus,
    label: "Try",
    Icon: Bookmark,
    activeColor: "text-[#E8834A]",
    activeBorder: "border-[#E8834A]",
    activeBg: "bg-[rgba(232,131,74,0.10)]",
  },
  {
    value: "visited" as RestaurantStatus,
    label: "Visited",
    Icon: Check,
    activeColor: "text-[#3A7A5C]",
    activeBorder: "border-[#3A7A5C]",
    activeBg: "bg-[rgba(58,122,92,0.10)]",
  },
  {
    value: "favourite" as RestaurantStatus,
    label: "Fav",
    Icon: Heart,
    activeColor: "text-[#D44C2A]",
    activeBorder: "border-[#D44C2A]",
    activeBg: "bg-[rgba(212,76,42,0.10)]",
  },
];

export function RatingSection({ restaurantId }: { restaurantId: string }) {
  const currentStatus = useMapStore((s) => s.statusMap.get(restaurantId));
  const updateStatus  = useMapStore((s) => s.updateStatus);
  const clearStatus   = useMapStore((s) => s.clearStatus);
  const openAuthModal = useAuthModal((s) => s.open);
  const [pendingRating, setPendingRating] = useState<number | null>(null);
  const [review, setReview] = useState("");

  async function setStatus(status: RestaurantStatus) {
    const { data: { user } } = await createClient().auth.getUser();
    if (!user) { openAuthModal(); return; }
    if (currentStatus === status) {
      clearStatus(restaurantId);
      toast.success("Removed");
      fetch(`/api/restaurants/${restaurantId}/rate`, { method: "DELETE" }).catch(() => {});
      return;
    }
    updateStatus(restaurantId, status);
    toast.success(
      status === "want_to_try" ? "Added to Want to Try"
      : status === "visited"   ? "Marked as Visited"
                               : "Added to Favourites",
    );
    fetch(`/api/restaurants/${restaurantId}/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => {});
  }

  async function saveRatingAndReview() {
    if (!currentStatus) return;
    toast.success("Rating saved");
    fetch(`/api/restaurants/${restaurantId}/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: currentStatus, rating: pendingRating, review: review || undefined }),
    }).catch(() => {});
  }

  const showRatingFields = currentStatus === "visited" || currentStatus === "favourite";

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {STATUS_OPTIONS.map(({ value, label, Icon, activeColor, activeBorder, activeBg }) => {
          const active = currentStatus === value;
          return (
            <button
              key={value}
              onClick={() => setStatus(value)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1.5 rounded-[14px] border py-3 text-[11px] font-semibold transition-all duration-200 active:scale-95",
                active
                  ? cn(activeBorder, activeBg, activeColor)
                  : "border-[#D4C8B4] text-[#8C7E72] hover:border-[#B8A89A] hover:text-[#2C2420]",
              )}
            >
              <Icon className="size-[17px]" strokeWidth={active ? 2.5 : 2} />
              {label}
            </button>
          );
        })}
      </div>

      {showRatingFields && (
        <div className="space-y-3 rounded-xl border border-[#D4C8B4] bg-[#F5F0E8] p-3">
          <div>
            <p className="mb-2 text-[11px] font-medium text-[#8C7E72]">Rating (optional)</p>
            <div className="flex gap-1">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPendingRating(pendingRating === n ? null : n)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold transition-all active:scale-90",
                    pendingRating === n
                      ? "bg-[#D44C2A] text-white shadow-[0_2px_6px_rgba(212,76,42,0.3)]"
                      : "bg-[#EDE6D8] text-[#8C7E72] hover:bg-[#D4C8B4]",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-medium text-[#8C7E72]">Review (optional)</p>
            <Textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="What did you think?"
              className="min-h-16 resize-none border-[#D4C8B4] bg-white text-sm"
            />
          </div>
          <Button size="sm" className="w-full bg-[#D44C2A] text-white hover:bg-[#B83D1E]" onClick={saveRatingAndReview}>
            Save rating
          </Button>
        </div>
      )}
    </div>
  );
}
