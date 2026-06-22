"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Navigation, Bookmark, X, Check, Plus } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useMapStore } from "@/store/mapStore";
import { priceLabel } from "@/lib/restaurants";
import { getHoursStatus } from "@/lib/openNow";
import { haversineDistance, formatDistance, walkTimeMinutes } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { CreateListSheet } from "@/components/lists/CreateListSheet";
import { useListsStore } from "@/store/listsStore";
import { createClient } from "@/lib/supabase/client";
import { useAuthModal } from "@/hooks/useAuthModal";
import { RatingSection } from "@/components/restaurant/RatingSection";
import type { ListWithMembership } from "@/lib/lists";

const HERO_GRADIENTS = [
  "linear-gradient(130deg, #9E5230 0%, #C47040 35%, #D58860 65%, #E0A07A 100%)",
  "linear-gradient(130deg, #2C5A38 0%, #3A7A5C 50%, #4A9A7C 100%)",
  "linear-gradient(130deg, #2C3A5A 0%, #3A5A8A 50%, #4A6AAA 100%)",
  "linear-gradient(130deg, #5A2C2A 0%, #8A3A38 50%, #AA5A58 100%)",
];
function heroGradient(name: string) {
  return HERO_GRADIENTS[name.charCodeAt(0) % HERO_GRADIENTS.length];
}

const AVATAR_COLORS = ["#D44C2A", "#3A7A5C", "#2C5A8A", "#8A4A2C"];
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

type Review = {
  rating: number | null;
  review: string | null;
  visited_at: string | null;
  profiles: { username: string | null; display_name: string | null; avatar_url: string | null } | null;
};

// ─── Panel content ────────────────────────────────────────────────────────────

type PanelContentProps = {
  restaurant: ReturnType<typeof useMapStore.getState>["restaurants"][number];
  isDesktop: boolean;
  onClose: () => void;
  locationPending: boolean;
  distance: number | null;
  walkMins: number | null;
  communityRating: { avg: number; count: number } | null;
  directionsUrl: string;
  showFull: boolean;
  onToggleFull: () => void;
  reviews: Review[] | null;
  reviewsLoading: boolean;
  showAddToList: boolean;
  onToggleAddToList: () => void;
  listItems: ListWithMembership[] | null;
  listsLoading: boolean;
  onToggleList: (list: ListWithMembership) => void;
  onOpenCreateList: () => void;
};

function PanelContent({
  restaurant,
  isDesktop,
  onClose,
  locationPending,
  distance,
  walkMins,
  communityRating,
  directionsUrl,
  showFull,
  onToggleFull,
  reviews,
  reviewsLoading,
  showAddToList,
  onToggleAddToList,
  listItems,
  listsLoading,
  onToggleList,
  onOpenCreateList,
}: PanelContentProps) {
  const hoursStatus = getHoursStatus(restaurant.opening_hours);
  const nowUtc = new Date();
  const todayIdx = new Date(nowUtc.getTime() + 7 * 60 * 60 * 1000).getUTCDay();

  return (
    <div className="flex min-h-0 flex-1 flex-col">

      {/* ── Hero ── */}
      <div className="relative h-[200px] w-full shrink-0 overflow-hidden">
        {restaurant.cover_photo_url ? (
          <img
            src={restaurant.cover_photo_url}
            alt={restaurant.name}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
              (e.currentTarget.nextElementSibling as HTMLElement).style.display = "block";
            }}
          />
        ) : null}
        <div
          className="h-full w-full"
          style={{
            background: heroGradient(restaurant.name),
            display: restaurant.cover_photo_url ? "none" : "block",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

        {!isDesktop && (
          <div className="absolute inset-x-0 top-0 flex justify-center pt-2.5">
            <div className="h-1 w-10 rounded-full bg-white/40" />
          </div>
        )}

        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
        >
          <X className="size-4" />
        </button>

        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
          <h2 className="text-xl font-bold leading-tight tracking-tight text-white">{restaurant.name}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            {hoursStatus && (
              <div className="flex items-center gap-1.5">
                <span className={cn("size-2 rounded-full", hoursStatus.open ? "bg-green-400" : "bg-red-400")} />
                <span className="text-xs font-medium text-white/90">
                  {hoursStatus.open ? "Open" : "Closed"}
                  {hoursStatus.timeLabel ? ` · ${hoursStatus.timeLabel}` : ""}
                </span>
              </div>
            )}
            <span className="text-xs text-white/70">
              {[priceLabel(restaurant.price_range), restaurant.district].filter(Boolean).join(" · ")}
            </span>
          </div>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4 space-y-4">

        {/* Tags */}
        {(restaurant.cuisine_type.length > 0 || restaurant.tags.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {restaurant.cuisine_type.map((c) => (
              <span key={c} className="rounded-full border border-[#D4C8B4] bg-[#EDE6D8] px-2.5 py-1 text-xs font-medium text-[#2C2420]">{c}</span>
            ))}
            {restaurant.tags.map((t) => (
              <span key={t} className="rounded-full border border-[#D4C8B4] bg-transparent px-2.5 py-1 text-xs font-normal text-[#8C7E72]">{t}</span>
            ))}
          </div>
        )}

        {/* Stats row */}
        <div className="flex overflow-hidden rounded-xl border border-[#D4C8B4] bg-[#EDE6D8]">
          <div className="flex flex-1 flex-col items-center gap-0.5 border-r border-[#D4C8B4] py-2.5">
            {locationPending ? (
              <Skeleton className="h-4 w-12" />
            ) : distance !== null ? (
              <>
                <span className="text-xs font-semibold text-[#2C2420]">{formatDistance(distance)}</span>
                {walkMins !== null && walkMins < 60 && (
                  <span className="text-[10px] text-[#8C7E72]">~{walkMins} min walk</span>
                )}
              </>
            ) : (
              <>
                <span className="text-xs text-[#8C7E72]">—</span>
                <span className="text-[10px] text-[#8C7E72]">Distance</span>
              </>
            )}
          </div>

          {restaurant.google_rating != null && (
            <div className="flex flex-1 flex-col items-center gap-0.5 border-r border-[#D4C8B4] py-2.5">
              <span className="text-xs font-semibold text-[#2C2420]">★ {restaurant.google_rating.toFixed(1)}</span>
              {restaurant.google_rating_count != null && (
                <span className="text-[10px] text-[#8C7E72]">{restaurant.google_rating_count.toLocaleString()} reviews</span>
              )}
            </div>
          )}

          <div className="flex flex-1 flex-col items-center gap-0.5 py-2.5">
            {communityRating ? (
              <>
                <span className="text-xs font-bold text-[#D44C2A]">{communityRating.avg.toFixed(1)}/10</span>
                <span className="text-[10px] text-[#8C7E72]">{communityRating.count} {communityRating.count === 1 ? "rating" : "ratings"}</span>
              </>
            ) : (
              <>
                <span className="text-xs text-[#8C7E72]">—</span>
                <span className="text-[10px] text-[#8C7E72]">Community</span>
              </>
            )}
          </div>
        </div>

        {/* Status */}
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#8C7E72]">Your status</p>
          <RatingSection restaurantId={restaurant.id} />
        </div>

        {/* Add to list — inline expandable */}
        <div>
          <button
            onClick={onToggleAddToList}
            className={cn(
              "flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors",
              showAddToList
                ? "border-[#D44C2A] bg-[rgba(212,76,42,0.06)] text-[#D44C2A]"
                : "border-[#D4C8B4] bg-transparent text-[#2C2420] hover:bg-[#EDE6D8]",
            )}
          >
            <span className="flex items-center gap-2"><Bookmark className="size-4" /> Add to list</span>
            {showAddToList ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>

          {showAddToList && (
            <div className="mt-2 overflow-hidden rounded-xl border border-[#D4C8B4] bg-[#EDE6D8]">
              {listsLoading ? (
                <div className="space-y-1 p-2">
                  {[1,2,3].map((i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
                </div>
              ) : (
                <>
                  {(!listItems || listItems.length === 0) && (
                    <p className="px-4 py-3 text-xs text-[#8C7E72]">No lists yet.</p>
                  )}
                  {listItems?.map((list) => (
                    <button
                      key={list.id}
                      onClick={() => onToggleList(list)}
                      className="flex w-full items-center gap-3 border-b border-[#D4C8B4] px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-[#D4C8B4]/30"
                    >
                      <span className="text-base">{list.emoji ?? "📋"}</span>
                      <span className="flex-1 text-sm font-medium text-[#2C2420]">{list.title}</span>
                      <span className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
                        list.contains
                          ? "border-[#D44C2A] bg-[#D44C2A] text-white"
                          : "border-[#D4C8B4] bg-white",
                      )}>
                        {list.contains && <Check className="size-3" />}
                      </span>
                    </button>
                  ))}
                  <button
                    onClick={onOpenCreateList}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#D44C2A] transition-colors hover:bg-[#D4C8B4]/30"
                  >
                    <Plus className="size-4" /> New list
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Directions */}
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#D44C2A] py-3.5 text-sm font-bold text-white shadow-[0_3px_10px_rgba(212,76,42,0.30)] transition-all hover:bg-[#B83D1E] active:scale-[.98]"
        >
          <Navigation className="size-4" /> Get Directions →
        </a>

        {/* View full toggle */}
        <button
          onClick={onToggleFull}
          className="flex w-full items-center justify-center gap-1.5 text-xs font-medium text-[#8C7E72] transition-colors hover:text-[#2C2420]"
        >
          {showFull ? (
            <><ChevronUp className="size-3.5" /> Show less</>
          ) : (
            <><ChevronDown className="size-3.5" /> View full</>
          )}
        </button>

        {/* ── Expanded: hours + community reviews ── */}
        {showFull && (
          <>
            {restaurant.opening_hours && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8C7E72]">Hours</p>
                <div className="overflow-hidden rounded-xl border border-[#D4C8B4]">
                  {DAYS.map((day, idx) => {
                    const entry = restaurant.opening_hours!.weekday_text.find((s) => s.startsWith(day + ":"));
                    const hoursStr = entry ? entry.slice(day.length + 1).trim() : "—";
                    const isToday = idx === todayIdx;
                    return (
                      <div
                        key={day}
                        className={cn(
                          "flex justify-between px-3 py-1.5 text-xs",
                          isToday ? "bg-[#F5E8E4] font-semibold text-[#D44C2A]" : "bg-[#EDE6D8] text-[#8C7E72]",
                          idx < DAYS.length - 1 && "border-b border-[#D4C8B4]",
                        )}
                      >
                        <span>{day}</span>
                        <span>{hoursStr}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8C7E72]">Community</p>
              {reviewsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </div>
              ) : reviews && reviews.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {reviews.map((row, i) => {
                    const profile = row.profiles;
                    const name = profile?.display_name ?? profile?.username ?? "User";
                    const initials = name.slice(0, 2).toUpperCase();
                    const color = avatarColor(name);
                    const score = row.rating;
                    return (
                      <div key={i} className="flex gap-3 rounded-xl border border-[#D4C8B4] bg-[#EDE6D8] p-3">
                        <div
                          className="flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                          style={{ backgroundColor: color }}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-[#2C2420]">@{profile?.username ?? "user"}</span>
                            {score != null && (
                              <span className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-bold",
                                score >= 8.5 ? "bg-[#D44C2A] text-white" : "border border-[#D4C8B4] bg-[#F5F0E8] text-[#2C2420]",
                              )}>
                                {score}/10
                              </span>
                            )}
                          </div>
                          {row.review && <p className="text-xs text-[#5A4E48]">{row.review}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-[#8C7E72]">No reviews yet.</p>
              )}
            </div>
          </>
        )}

        {restaurant.saves_count > 0 && (
          <p className="text-center text-xs text-[#8C7E72]">
            {restaurant.saves_count} {restaurant.saves_count === 1 ? "person" : "people"} saved this
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function RestaurantPanel() {
  const selectedId      = useMapStore((s) => s.selectedId);
  const restaurants     = useMapStore((s) => s.restaurants);
  const select          = useMapStore((s) => s.select);
  const userLocation    = useMapStore((s) => s.userLocation);
  const setUserLocation = useMapStore((s) => s.setUserLocation);
  const { addList }     = useListsStore();

  const openAuthModal = useAuthModal((s) => s.open);

  const [isDesktop, setIsDesktop]             = useState<boolean | null>(null);
  const [locationPending, setLocationPending] = useState(false);
  const [communityRating, setCommunityRating] = useState<{ avg: number; count: number } | null>(null);
  const [showFull, setShowFull]               = useState(false);
  const [reviews, setReviews]                 = useState<Review[] | null>(null);
  const [reviewsLoading, setReviewsLoading]   = useState(false);
  const [showAddToList, setShowAddToList]     = useState(false);
  const [listItems, setListItems]             = useState<ListWithMembership[] | null>(null);
  const [listsLoading, setListsLoading]       = useState(false);
  const [createListOpen, setCreateListOpen]   = useState(false);

  const ratingFetchedFor  = useRef<string | null>(null);
  const reviewsFetchedFor = useRef<string | null>(null);
  const listsFetchedFor   = useRef<string | null>(null);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const restaurant = restaurants.find((r) => r.id === selectedId) ?? null;

  useEffect(() => {
    setShowFull(false);
    setReviews(null);
    reviewsFetchedFor.current = null;
    setShowAddToList(false);
    setListItems(null);
    listsFetchedFor.current = null;
  }, [restaurant?.id]);

  useEffect(() => {
    if (!restaurant) return;
    if (userLocation) { setLocationPending(false); return; }
    setLocationPending(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLocation([pos.coords.longitude, pos.coords.latitude]); setLocationPending(false); },
      () => setLocationPending(false),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.id]);

  useEffect(() => {
    if (!restaurant || ratingFetchedFor.current === restaurant.id) return;
    ratingFetchedFor.current = restaurant.id;
    setCommunityRating(null);
    createClient()
      .from("user_restaurants")
      .select("rating")
      .eq("restaurant_id", restaurant.id)
      .not("rating", "is", null)
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        const avg = data.reduce((sum, r) => sum + (r.rating ?? 0), 0) / data.length;
        setCommunityRating({ avg, count: data.length });
      });
  }, [restaurant?.id]);

  useEffect(() => {
    if (!showFull || !restaurant || reviewsFetchedFor.current === restaurant.id) return;
    reviewsFetchedFor.current = restaurant.id;
    setReviewsLoading(true);
    createClient()
      .from("user_restaurants")
      .select("rating, review, visited_at, profiles(username, display_name, avatar_url)")
      .eq("restaurant_id", restaurant.id)
      .eq("is_public", true)
      .in("status", ["visited", "favourite"])
      .order("visited_at", { ascending: false })
      .then(({ data }) => {
        setReviews((data as unknown as Review[]) ?? []);
        setReviewsLoading(false);
      });
  }, [showFull, restaurant?.id]);

  useEffect(() => {
    if (!showAddToList || !restaurant || listsFetchedFor.current === restaurant.id) return;
    listsFetchedFor.current = restaurant.id;
    setListsLoading(true);
    fetch(`/api/lists?restaurantId=${restaurant.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setListItems(data as ListWithMembership[]);
        setListsLoading(false);
      })
      .catch(() => setListsLoading(false));
  }, [showAddToList, restaurant?.id]);

  async function toggleList(list: ListWithMembership) {
    if (!restaurant) return;
    setListItems((prev) => prev?.map((l) => l.id === list.id ? { ...l, contains: !l.contains } : l) ?? prev);
    if (list.contains) {
      const res = await fetch(`/api/lists/${list.id}/restaurants/${restaurant.id}`, { method: "DELETE" });
      if (!res.ok) setListItems((prev) => prev?.map((l) => l.id === list.id ? { ...l, contains: true } : l) ?? prev);
    } else {
      const res = await fetch(`/api/lists/${list.id}/restaurants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId: restaurant.id }),
      });
      if (!res.ok) setListItems((prev) => prev?.map((l) => l.id === list.id ? { ...l, contains: false } : l) ?? prev);
    }
  }

  const distance = userLocation && restaurant
    ? haversineDistance(userLocation[1], userLocation[0], restaurant.latitude, restaurant.longitude)
    : null;
  const walkMins = distance !== null ? walkTimeMinutes(distance) : null;

  const directionsUrl = restaurant
    ? `https://www.google.com/maps/dir/?api=1&destination=${restaurant.latitude},${restaurant.longitude}${restaurant.google_place_id ? `&destination_place_id=${restaurant.google_place_id}` : ""}`
    : "#";

  const contentProps = restaurant ? {
    restaurant,
    onClose: () => select(null),
    locationPending,
    distance,
    walkMins,
    communityRating,
    directionsUrl,
    showFull,
    onToggleFull: () => setShowFull((v) => !v),
    reviews,
    reviewsLoading,
    showAddToList,
    onToggleAddToList: async () => {
      const { data: { user } } = await createClient().auth.getUser();
      if (!user) { openAuthModal(); return; }
      setShowAddToList((v) => !v);
    },
    listItems,
    listsLoading,
    onToggleList: toggleList,
    onOpenCreateList: () => setCreateListOpen(true),
  } : null;

  if (isDesktop === null) return null;

  return (
    <>
      {isDesktop && (
        <div
          className={cn(
            "absolute right-0 top-0 z-10 h-full w-[380px] flex-col border-l border-[#D4C8B4] bg-[#F5F0E8] shadow-[-8px_0_24px_rgba(0,0,0,0.06)] transition-transform duration-300 ease-out",
            restaurant ? "flex translate-x-0" : "translate-x-full hidden",
          )}
        >
          {restaurant && contentProps && <PanelContent {...contentProps} isDesktop={true} />}
        </div>
      )}

      {!isDesktop && (
        <Sheet open={!!restaurant} onOpenChange={(open) => !open && select(null)}>
          <SheetContent
            side="bottom"
            className="mx-auto flex max-h-[85vh] max-w-2xl flex-col rounded-t-2xl p-0 overflow-hidden"
            aria-label={restaurant?.name ?? "Restaurant details"}
          >
            {restaurant && contentProps && <PanelContent {...contentProps} isDesktop={false} />}
          </SheetContent>
        </Sheet>
      )}

      {restaurant && (
        <CreateListSheet
          open={createListOpen}
          onOpenChange={setCreateListOpen}
          onCreated={(newList) => {
            addList(newList);
            setListItems((prev) => prev ? [...prev, { ...newList, contains: false }] : [{ ...newList, contains: false }]);
            setCreateListOpen(false);
          }}
        />
      )}
    </>
  );
}
