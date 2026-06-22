"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, Navigation } from "lucide-react";
import { useMapStore } from "@/store/mapStore";
import { FilterSheet } from "./FilterSheet";
import { cn } from "@/lib/utils";

export function FilterBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const cuisineCount    = useMapStore((s) => s.cuisines.size);
  const priceCount      = useMapStore((s) => s.prices.size);
  const nearMe          = useMapStore((s) => s.nearMe);
  const openNow         = useMapStore((s) => s.openNow);
  const activeCount     = cuisineCount + priceCount + (nearMe ? 1 : 0) + (openNow ? 1 : 0);
  const panelOpen       = useMapStore((s) => !!s.selectedId);
  const userLocation    = useMapStore((s) => s.userLocation);
  const setUserLocation = useMapStore((s) => s.setUserLocation);
  const setFlyToTarget  = useMapStore((s) => s.setFlyToTarget);

  function locateMe() {
    if (userLocation) {
      setFlyToTarget(userLocation);
      return;
    }
    navigator.geolocation.getCurrentPosition((pos) => {
      const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
      setUserLocation(coords);
      setFlyToTarget(coords);
    });
  }

  return (
    <>
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pb-3 transition-all duration-300",
          "md:pt-4",
          panelOpen && "md:pr-[392px]",
        )}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="pointer-events-auto flex items-center gap-2">

          {/* Search pill */}
          <button
            onClick={() => router.push("/search")}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-full px-4 py-2.5 text-sm",
              "border border-[#D4C8B4]/60 bg-[#F5F0E8]/93 text-[#8C7E72]",
              "shadow-[0_4px_20px_rgba(0,0,0,.13),0_1px_4px_rgba(0,0,0,.08)]",
              "backdrop-blur-[10px] transition-all",
              "hover:bg-[#F5F0E8] hover:shadow-[0_6px_24px_rgba(0,0,0,.16)]",
            )}
          >
            <Search className="size-[15px] shrink-0 text-[#8C7E72]" />
            <span>Find a restaurant…</span>
          </button>

          {/* Filter pill — badge shows active filter count */}
          <div className="relative shrink-0">
            <button
              onClick={() => setOpen(true)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold",
                "border border-[#D4C8B4]/60 bg-[#F5F0E8]/93 text-[#2C2420]",
                "shadow-[0_4px_20px_rgba(0,0,0,.13),0_1px_4px_rgba(0,0,0,.08)]",
                "backdrop-blur-[10px] transition-all",
                "hover:bg-[#F5F0E8]",
              )}
            >
              <SlidersHorizontal className="size-[14px]" />
              Filters
            </button>

            {activeCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex size-[18px] items-center justify-center rounded-full border-2 border-[#F5F0E8] bg-[#D44C2A] text-[9px] font-bold leading-none text-white">
                {activeCount}
              </span>
            )}
          </div>
        </div>

        <FilterSheet open={open} onOpenChange={setOpen} />
      </div>

      {/* Locate me — fixed bottom-right */}
      <button
        onClick={locateMe}
        aria-label="Centre map on my location"
        className={cn(
          "fixed z-20 inline-flex size-11 items-center justify-center rounded-full",
          "border border-[#D4C8B4] bg-[#F5F0E8] shadow-md text-[#2C2420]",
          "hover:bg-[#EDE6D8] active:scale-90 transition-all",
        )}
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 90px)", right: "16px" }}
      >
        <Navigation className="size-[15px]" />
      </button>
    </>
  );
}
