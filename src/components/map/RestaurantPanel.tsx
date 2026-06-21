"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bookmark, ArrowUpRight, Navigation, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useMapStore, type RestaurantStatus } from "@/store/mapStore";
import { priceLabel } from "@/lib/restaurants";
import { getHoursStatus } from "@/lib/openNow";
import { haversineDistance, formatDistance, walkTimeMinutes } from "@/lib/geo";
import { staticMapUrl } from "@/lib/staticMap";
import { cn } from "@/lib/utils";
import { AddToListSheet } from "@/components/lists/AddToListSheet";
import { createClient } from "@/lib/supabase/client";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

const STATUS_OPTIONS: { value: RestaurantStatus; label: string }[] = [
  { value: "want_to_try", label: "Want to Try" },
  { value: "visited", label: "Visited" },
  { value: "favourite", label: "Favourite" },
];

function RatingSection({ restaurantId }: { restaurantId: string }) {
  const currentStatus = useMapStore((s) => s.statusMap.get(restaurantId));
  const updateStatus = useMapStore((s) => s.updateStatus);
  const clearStatus = useMapStore((s) => s.clearStatus);
  const [pendingRating, setPendingRating] = useState<number | null>(null);
  const [review, setReview] = useState("");

  async function setStatus(status: RestaurantStatus) {
    if (currentStatus === status) {
      clearStatus(restaurantId);
      toast.success("Removed");
      fetch(`/api/restaurants/${restaurantId}/rate`, { method: "DELETE" }).catch(() => {});
      return;
    }
    updateStatus(restaurantId, status);
    toast.success(
      status === "want_to_try"
        ? "Added to Want to Try"
        : status === "visited"
          ? "Marked as Visited"
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
        {STATUS_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setStatus(value)}
            className={cn(
              "flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
              currentStatus === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {showRatingFields && (
        <div className="space-y-3 rounded-lg border p-3">
          <div>
            <p className="text-muted-foreground mb-2 text-xs">Rating (optional)</p>
            <div className="flex gap-1">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPendingRating(pendingRating === n ? null : n)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded text-xs font-medium transition-colors",
                    pendingRating === n
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-primary/20",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-muted-foreground mb-1.5 text-xs">Review (optional)</p>
            <Textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="What did you think?"
              className="min-h-16 resize-none text-sm"
            />
          </div>

          <Button size="sm" className="w-full" onClick={saveRatingAndReview}>
            Save rating
          </Button>
        </div>
      )}
    </div>
  );
}

export function RestaurantPanel() {
  const selectedId = useMapStore((s) => s.selectedId);
  const restaurants = useMapStore((s) => s.restaurants);
  const select = useMapStore((s) => s.select);
  const userLocation = useMapStore((s) => s.userLocation);
  const setUserLocation = useMapStore((s) => s.setUserLocation);
  const [locationPending, setLocationPending] = useState(false);
  const [addToListOpen, setAddToListOpen] = useState(false);
  const [communityRating, setCommunityRating] = useState<{ avg: number; count: number } | null>(null);
  const ratingFetchedFor = useRef<string | null>(null);
  const { resolvedTheme } = useTheme();

  const restaurant = restaurants.find((r) => r.id === selectedId) ?? null;

  // Request geolocation when a new restaurant panel opens.
  useEffect(() => {
    if (!restaurant) return;
    if (userLocation) {
      setLocationPending(false);
      return;
    }
    setLocationPending(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.longitude, pos.coords.latitude]);
        setLocationPending(false);
      },
      () => setLocationPending(false),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.id]);

  // Fetch community rating when panel opens for a new restaurant.
  useEffect(() => {
    if (!restaurant || ratingFetchedFor.current === restaurant.id) return;
    ratingFetchedFor.current = restaurant.id;
    setCommunityRating(null);
    const supabase = createClient();
    supabase
      .from("user_restaurants")
      .select("rating")
      .eq("restaurant_id", restaurant.id)
      .not("rating", "is", null)
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        const count = data.length;
        const avg = data.reduce((sum, r) => sum + (r.rating ?? 0), 0) / count;
        setCommunityRating({ avg, count });
      });
  }, [restaurant?.id]);

  const distance =
    userLocation && restaurant
      ? haversineDistance(
          userLocation[1],
          userLocation[0],
          restaurant.latitude,
          restaurant.longitude,
        )
      : null;
  const walkMins = distance !== null ? walkTimeMinutes(distance) : null;

  const isDark = resolvedTheme === "dark";

  return (
    <Sheet open={!!restaurant} onOpenChange={(open) => !open && select(null)}>
      <SheetContent side="bottom" className="mx-auto max-h-[85vh] max-w-2xl rounded-t-2xl">
        {restaurant && (
          <>
            <SheetHeader className="pb-2">
              <SheetTitle className="text-xl">{restaurant.name}</SheetTitle>
              {(() => {
                const status = getHoursStatus(restaurant.opening_hours);
                if (!status) return null;
                return (
                  <div className="flex items-center gap-1.5 text-sm">
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        status.open ? "bg-green-500" : "bg-red-500",
                      )}
                    />
                    <span className={status.open ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                      {status.open ? "Open now" : "Closed"}
                    </span>
                    {status.timeLabel && (
                      <span className="text-muted-foreground">· {status.timeLabel}</span>
                    )}
                  </div>
                );
              })()}
            </SheetHeader>

            <div className="space-y-4 overflow-y-auto px-4 pb-6">
              {/* Meta row: district, price */}
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                {restaurant.district && <span>{restaurant.district}</span>}
                <span className="text-primary font-medium">
                  {priceLabel(restaurant.price_range)}
                </span>
              </div>

              {/* Google rating */}
              {restaurant.google_rating != null && (
                <p className="text-sm text-muted-foreground">
                  {restaurant.google_rating.toFixed(1)}★
                  {restaurant.google_rating_count != null && (
                    <span> ({restaurant.google_rating_count.toLocaleString()})</span>
                  )}
                </p>
              )}

              {restaurant.address && (
                <p className="text-muted-foreground text-sm">{restaurant.address}</p>
              )}

              {(restaurant.latitude != null && restaurant.longitude != null) && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${restaurant.latitude},${restaurant.longitude}${restaurant.google_place_id ? `&destination_place_id=${restaurant.google_place_id}` : ""}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm hover:underline"
                >
                  <MapPin className="size-3.5 shrink-0" />
                  Open in Google Maps
                </a>
              )}

              {restaurant.cuisine_type.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {restaurant.cuisine_type.map((c) => (
                    <Badge key={c} variant="secondary">{c}</Badge>
                  ))}
                </div>
              )}

              {restaurant.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {restaurant.tags.map((t) => (
                    <Badge key={t} variant="outline" className="font-normal">{t}</Badge>
                  ))}
                </div>
              )}

              {/* Cover photo from Google Places */}
              {restaurant.cover_photo_url && (
                <div className="h-40 w-full overflow-hidden rounded-lg">
                  <img
                    src={restaurant.cover_photo_url}
                    alt={restaurant.name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.currentTarget.parentElement as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
              )}

              {/* Static map thumbnail */}
              {TOKEN && (
                <div className="h-36 w-full overflow-hidden rounded-lg">
                  <img
                    src={staticMapUrl({
                      lng: restaurant.longitude,
                      lat: restaurant.latitude,
                      width: 600,
                      height: 200,
                      zoom: 15,
                      token: TOKEN,
                      dark: isDark,
                    })}
                    alt={`Map showing ${restaurant.name}`}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.currentTarget.parentElement as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
              )}

              {/* Distance row */}
              {locationPending && <Skeleton className="h-4 w-48" />}
              {!locationPending && distance !== null && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Navigation className="size-3.5 shrink-0" />
                  <span>{formatDistance(distance)}</span>
                  {walkMins !== null && walkMins < 60 && (
                    <span>· ~{walkMins} min walk</span>
                  )}
                </div>
              )}

              <RatingSection restaurantId={restaurant.id} />

              {/* Add to list + placeholder CTAs */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => setAddToListOpen(true)}
                >
                  <Bookmark className="size-4" /> Add to list
                </Button>
                <Link
                  href={`/restaurant/${restaurant.id}`}
                  className={buttonVariants({ variant: "outline" })}
                >
                  <ArrowUpRight className="size-4" /> View full
                </Link>
              </div>

              {restaurant && (
                <AddToListSheet
                  open={addToListOpen}
                  onOpenChange={setAddToListOpen}
                  restaurantId={restaurant.id}
                />
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
