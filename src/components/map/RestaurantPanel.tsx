"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Star, Bookmark, BookmarkCheck, Send, ArrowUpRight, Navigation } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMapStore } from "@/store/mapStore";
import { priceLabel } from "@/lib/restaurants";

async function getDirections(
  restaurant: { id: string; name: string; longitude: number; latitude: number },
  setRoute: ReturnType<typeof useMapStore.getState>["setRoute"],
  setUserLocation: ReturnType<typeof useMapStore.getState>["setUserLocation"],
  select: ReturnType<typeof useMapStore.getState>["select"],
) {
  return new Promise<void>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { longitude: lng, latitude: lat } = pos.coords;
        try {
          const res = await fetch(
            `/api/directions?from=${lng},${lat}&to=${restaurant.longitude},${restaurant.latitude}&profile=walking`,
          );
          if (!res.ok) throw new Error("No route");
          const data = await res.json();
          setRoute({
            ...data,
            restaurantName: restaurant.name,
            restaurantId: restaurant.id,
            profile: "walking",
          });
          setUserLocation([lng, lat]);
          select(null);
        } catch {
          toast.error("Could not get directions");
        }
        resolve();
      },
      () => {
        toast.error("Enable location to get directions");
        resolve();
      },
    );
  });
}

export function RestaurantPanel() {
  const selectedId = useMapStore((s) => s.selectedId);
  const restaurants = useMapStore((s) => s.restaurants);
  const savedIds = useMapStore((s) => s.savedIds);
  const select = useMapStore((s) => s.select);
  const markSaved = useMapStore((s) => s.markSaved);
  const setRoute = useMapStore((s) => s.setRoute);
  const setUserLocation = useMapStore((s) => s.setUserLocation);
  const [saving, setSaving] = useState(false);
  const [gettingDirections, setGettingDirections] = useState(false);

  const restaurant = restaurants.find((r) => r.id === selectedId) ?? null;
  const isSaved = restaurant ? savedIds.has(restaurant.id) : false;

  async function handleSave() {
    if (!restaurant || isSaved) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/restaurants/${restaurant.id}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "want_to_try" }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "" }));
        throw new Error(error || "Could not save");
      }
      markSaved(restaurant.id);
      toast.success(`Saved ${restaurant.name} to Want to Try`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={!!restaurant}
      onOpenChange={(open) => !open && select(null)}
    >
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[70vh] max-w-2xl rounded-t-2xl"
      >
        {restaurant && (
          <>
            <SheetHeader className="pb-2">
              <SheetTitle className="text-xl">{restaurant.name}</SheetTitle>
            </SheetHeader>

            <div className="space-y-4 overflow-y-auto px-4 pb-6">
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                {restaurant.district && <span>{restaurant.district}</span>}
                <span className="text-primary font-medium">
                  {priceLabel(restaurant.price_range)}
                </span>
                {restaurant.google_rating != null && (
                  <span className="inline-flex items-center gap-1">
                    <Star className="size-3.5 fill-current text-amber-400" />
                    {restaurant.google_rating.toFixed(1)}
                  </span>
                )}
              </div>

              {restaurant.address && (
                <p className="text-muted-foreground text-sm">
                  {restaurant.address}
                </p>
              )}

              {restaurant.cuisine_type.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {restaurant.cuisine_type.map((c) => (
                    <Badge key={c} variant="secondary">
                      {c}
                    </Badge>
                  ))}
                </div>
              )}

              {restaurant.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {restaurant.tags.map((t) => (
                    <Badge key={t} variant="outline" className="font-normal">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  onClick={handleSave}
                  disabled={saving || isSaved}
                  variant={isSaved ? "secondary" : "default"}
                >
                  {isSaved ? (
                    <>
                      <BookmarkCheck className="size-4" /> Saved
                    </>
                  ) : (
                    <>
                      <Bookmark className="size-4" /> Save
                    </>
                  )}
                </Button>
                <Button variant="outline" disabled title="Coming in Phase 2">
                  <Star className="size-4" /> Rate
                </Button>
                <Button variant="outline" disabled title="Coming in Phase 2">
                  <Send className="size-4" /> Recommend
                </Button>
                <Button variant="outline" disabled title="Coming in Phase 2">
                  <ArrowUpRight className="size-4" /> View full
                </Button>
              </div>

              <Button
                variant="outline"
                className="w-full"
                disabled={gettingDirections}
                onClick={async () => {
                  setGettingDirections(true);
                  await getDirections(restaurant, setRoute, setUserLocation, select);
                  setGettingDirections(false);
                }}
              >
                <Navigation className="size-4" />
                {gettingDirections ? "Getting directions…" : "Get directions"}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
