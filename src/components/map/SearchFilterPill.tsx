"use client";

import { X } from "lucide-react";
import { useMapStore } from "@/store/mapStore";

export function SearchFilterPill() {
  const searchQuery = useMapStore((s) => s.searchQuery);
  const searchFilterIds = useMapStore((s) => s.searchFilterIds);
  const clearSearchFilter = useMapStore((s) => s.clearSearchFilter);

  if (!searchFilterIds) return null;

  return (
    <div className="absolute bottom-24 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border bg-card/90 px-4 py-2 text-sm shadow-md backdrop-blur md:bottom-6">
      <span className="font-medium">{searchFilterIds.size} result{searchFilterIds.size !== 1 ? "s" : ""}</span>
      <span className="text-muted-foreground">for &ldquo;{searchQuery}&rdquo;</span>
      <button
        onClick={clearSearchFilter}
        className="text-muted-foreground hover:text-foreground ml-1"
        aria-label="Clear search filter"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
