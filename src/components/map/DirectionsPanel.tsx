"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  MapPin,
  Navigation,
  X,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useMapStore, type RouteStep } from "@/store/mapStore";
import { cn } from "@/lib/utils";

function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

function formatDuration(s: number): string {
  const mins = Math.round(s / 60);
  return mins < 1 ? "< 1 min" : `${mins} min`;
}

function StepIcon({ type, modifier }: { type: string; modifier?: string }) {
  if (type === "depart" || type === "arrive") {
    return type === "arrive" ? <MapPin className="size-4 shrink-0" /> : <Navigation className="size-4 shrink-0" />;
  }
  if (type === "turn") {
    if (modifier?.includes("left")) return <CornerUpLeft className="size-4 shrink-0" />;
    if (modifier?.includes("right")) return <CornerUpRight className="size-4 shrink-0" />;
  }
  return <ArrowUp className="size-4 shrink-0" />;
}

export function DirectionsPanel() {
  const activeRoute = useMapStore((s) => s.activeRoute);
  const clearRoute = useMapStore((s) => s.clearRoute);
  const setRoute = useMapStore((s) => s.setRoute);
  const setUserLocation = useMapStore((s) => s.setUserLocation);
  const userLocation = useMapStore((s) => s.userLocation);
  const [switching, setSwitching] = useState(false);

  async function switchProfile(profile: "walking" | "driving") {
    if (!activeRoute || !userLocation || switching) return;
    setSwitching(true);
    try {
      const [toLng, toLat] = activeRoute.geometry.coordinates.at(-1) as [number, number];
      const res = await fetch(
        `/api/directions?from=${userLocation[0]},${userLocation[1]}&to=${toLng},${toLat}&profile=${profile}`,
      );
      if (!res.ok) throw new Error("Could not fetch route");
      const data = await res.json();
      setRoute({ ...data, restaurantName: activeRoute.restaurantName, restaurantId: activeRoute.restaurantId, profile });
      setUserLocation(userLocation);
    } catch {
      toast.error("Could not update route");
    } finally {
      setSwitching(false);
    }
  }

  return (
    <Sheet open={!!activeRoute} onOpenChange={(open) => !open && clearRoute()}>
      <SheetContent side="bottom" className="mx-auto max-h-[70vh] max-w-2xl rounded-t-2xl">
        {activeRoute && (
          <>
            <SheetHeader className="pb-2">
              <SheetTitle className="text-lg">To {activeRoute.restaurantName}</SheetTitle>
            </SheetHeader>

            <div className="space-y-4 overflow-y-auto px-4 pb-6">
              {/* Summary */}
              <div className="text-muted-foreground flex items-center gap-3 text-sm">
                <span className="text-foreground font-medium">
                  {formatDistance(activeRoute.distance)}
                </span>
                <span>·</span>
                <span>{formatDuration(activeRoute.duration)}</span>
              </div>

              {/* Mode toggle */}
              <div className="flex gap-2">
                {(["walking", "driving"] as const).map((p) => (
                  <button
                    key={p}
                    disabled={switching}
                    onClick={() => switchProfile(p)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors capitalize",
                      activeRoute.profile === p
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground hover:bg-muted",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Steps */}
              <ol className="space-y-3">
                {activeRoute.steps.map((step: RouteStep & { modifier?: string }, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="text-muted-foreground mt-0.5">
                      <StepIcon type={step.type} modifier={step.modifier} />
                    </span>
                    <span className="flex-1">{step.instruction}</span>
                    {step.distance > 0 && (
                      <span className="text-muted-foreground shrink-0 tabular-nums">
                        {formatDistance(step.distance)}
                      </span>
                    )}
                  </li>
                ))}
              </ol>

              <Button variant="outline" className="w-full" onClick={clearRoute}>
                <X className="size-4" /> End directions
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
