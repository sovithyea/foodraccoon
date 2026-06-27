"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, Navigation, Clock } from "lucide-react";
import { useMapStore } from "@/store/mapStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";

const PRICES = [1, 2, 3, 4];

const CHIP =
  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FilterSheet({ open, onOpenChange }: Props) {
  const restaurants = useMapStore((s) => s.restaurants);
  const cuisines = useMapStore((s) => s.cuisines);
  const prices = useMapStore((s) => s.prices);
  const toggleCuisine = useMapStore((s) => s.toggleCuisine);
  const togglePrice = useMapStore((s) => s.togglePrice);
  const nearMeStore = useMapStore((s) => s.nearMe);
  const setNearMeStore = useMapStore((s) => s.setNearMe);
  const openNowStore = useMapStore((s) => s.openNow);
  const setOpenNowStore = useMapStore((s) => s.setOpenNow);
  const userLocation = useMapStore((s) => s.userLocation);
  const setUserLocation = useMapStore((s) => s.setUserLocation);

  // Local draft — committed to the store only on Apply.
  const [draftPrices, setDraftPrices] = useState<Set<number>>(new Set());
  const [draftCuisines, setDraftCuisines] = useState<Set<string>>(new Set());
  const [draftNearMe, setDraftNearMe] = useState(false);
  const [draftOpenNow, setDraftOpenNow] = useState(false);
  const [locationPending, setLocationPending] = useState(false);

  // Seed the draft from the store each time the sheet opens.
  useEffect(() => {
    if (open) {
      setDraftPrices(new Set(prices));
      setDraftCuisines(new Set(cuisines));
      setDraftNearMe(nearMeStore);
      setDraftOpenNow(openNowStore);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const cuisineOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of restaurants)
      for (const c of r.cuisine_type) counts.set(c, (counts.get(c) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }, [restaurants]);

  const toggleDraftPrice = (p: number) =>
    setDraftPrices((prev) => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });

  const toggleDraftCuisine = (c: string) =>
    setDraftCuisines((prev) => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });

  const handleNearMeToggle = () => {
    const next = !draftNearMe;
    setDraftNearMe(next);
    if (next && userLocation === null) {
      setLocationPending(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([pos.coords.longitude, pos.coords.latitude]);
          setLocationPending(false);
        },
        () => setLocationPending(false),
      );
    }
  };

  const clearAll = () => {
    setDraftPrices(new Set());
    setDraftCuisines(new Set());
    setDraftNearMe(false);
    setDraftOpenNow(false);
  };

  const apply = () => {
    // Reconcile store state to the draft via the existing toggle actions.
    const current = useMapStore.getState();
    for (const p of PRICES) {
      if (draftPrices.has(p) !== current.prices.has(p)) togglePrice(p);
    }
    const allCuisines = new Set([...current.cuisines, ...draftCuisines]);
    for (const c of allCuisines) {
      if (draftCuisines.has(c) !== current.cuisines.has(c)) toggleCuisine(c);
    }
    setNearMeStore(draftNearMe);
    setOpenNowStore(draftOpenNow);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] overflow-y-auto lg:inset-x-auto lg:inset-y-0 lg:left-auto lg:right-0 lg:h-full lg:max-h-none lg:w-3/4 lg:max-w-sm lg:border-t-0 lg:border-l"
      >
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4">
          {/* Price */}
          <section>
            <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
              Price
            </h3>
            <div className="flex flex-wrap gap-2">
              {PRICES.map((p) => (
                <button
                  key={p}
                  onClick={() => toggleDraftPrice(p)}
                  className={cn(
                    CHIP,
                    draftPrices.has(p)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground hover:bg-muted",
                  )}
                >
                  {"$".repeat(p)}
                </button>
              ))}
            </div>
          </section>

          {/* Cuisine */}
          <section>
            <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
              Cuisine
            </h3>
            <div className="flex flex-wrap gap-2">
              {cuisineOptions.map((c) => (
                <button
                  key={c}
                  onClick={() => toggleDraftCuisine(c)}
                  className={cn(
                    CHIP,
                    draftCuisines.has(c)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground hover:bg-muted",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </section>

          {/* Options */}
          <section>
            <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
              Options
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                disabled
                title="Coming in a later phase"
                className={cn(
                  CHIP,
                  "bg-card text-muted-foreground inline-flex cursor-not-allowed items-center gap-1.5",
                )}
              >
                <Users className="size-3.5" /> Friends saved
              </button>
              <div className="flex flex-col gap-1">
                <button
                  onClick={handleNearMeToggle}
                  className={cn(
                    CHIP,
                    "inline-flex items-center gap-1.5",
                    draftNearMe
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground hover:bg-muted",
                  )}
                >
                  <Navigation className="size-3.5" /> Near me
                </button>
                {locationPending && (
                  <span className="text-muted-foreground px-1 text-xs">
                    Requesting your location…
                  </span>
                )}
              </div>
              <button
                onClick={() => setDraftOpenNow((v) => !v)}
                className={cn(
                  CHIP,
                  "inline-flex items-center gap-1.5",
                  draftOpenNow
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground hover:bg-muted",
                )}
              >
                <Clock className="size-3.5" /> Open now
              </button>
            </div>
          </section>
        </div>

        <SheetFooter className="flex-row gap-2">
          <Button variant="outline" size="lg" className="flex-1" onClick={clearAll}>
            Clear all
          </Button>
          <Button size="lg" className="flex-1" onClick={apply}>
            Apply
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
