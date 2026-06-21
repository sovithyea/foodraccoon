"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import { useMapStore } from "@/store/mapStore";
import { FilterSheet } from "./FilterSheet";

export function FilterBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const cuisineCount = useMapStore((s) => s.cuisines.size);
  const priceCount = useMapStore((s) => s.prices.size);
  const nearMe = useMapStore((s) => s.nearMe);
  const openNow = useMapStore((s) => s.openNow);
  const activeCount = cuisineCount + priceCount + (nearMe ? 1 : 0) + (openNow ? 1 : 0);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-3">
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          onClick={() => router.push("/search")}
          className="bg-card/90 text-muted-foreground hover:bg-card flex w-full items-center gap-2 rounded-full border px-4 py-2 text-sm shadow-sm backdrop-blur transition-colors"
        >
          <Search className="size-4 shrink-0" />
          Search restaurants...
        </button>
        <button
          onClick={() => setOpen(true)}
          className="bg-card/90 text-foreground hover:bg-card inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium shadow-sm backdrop-blur transition-colors"
        >
          <SlidersHorizontal className="size-4" />
          Filters{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
      </div>

      <FilterSheet open={open} onOpenChange={setOpen} />
    </div>
  );
}
