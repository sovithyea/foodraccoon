"use client";

import React from "react";
import { priceLabel } from "@/lib/restaurants";
import { formatDistance } from "@/lib/geo";
import { useMapStore, type RestaurantStatus } from "@/store/mapStore";
import type { SearchResult } from "@/lib/search";
import { cn } from "@/lib/utils";

// Left-border colour encodes the user's save status at a glance.
const STATUS_BAR: Record<RestaurantStatus, string> = {
  want_to_try: "bg-[#E8834A]",
  visited:     "bg-[#3A7A5C]",
  favourite:   "bg-[#D44C2A]",
};

export function SearchResultRow({
  restaurant,
  subtitle,
  distanceMetres,
  onSelect,
  nameNode,
  isFocused,
}: {
  restaurant: SearchResult;
  subtitle?: string;
  distanceMetres?: number;
  onSelect: () => void;
  nameNode?: React.ReactNode;
  isFocused?: boolean;
}) {
  const userStatus = useMapStore((s) => s.statusMap.get(restaurant.id));
  const barColor   = userStatus ? STATUS_BAR[userStatus] : "bg-[#D4C8B4]";

  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full items-stretch px-4 text-left transition-colors hover:bg-[#EDE6D8]",
        isFocused && "bg-[#EDE6D8]",
      )}
    >
      {/* Status bar */}
      <span className={cn("my-1.5 mr-3 w-[3px] shrink-0 rounded-full", barColor)} />

      {/* Content */}
      <div className="flex-1 min-w-0 border-b border-[#EDE6D8] py-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-semibold text-[#2C2420]">
            {nameNode ?? restaurant.name}
          </span>
          <div className="flex shrink-0 items-center gap-2 text-xs text-[#8C7E72]">
            {distanceMetres !== undefined && (
              <span>{formatDistance(distanceMetres)}</span>
            )}
            <span>{priceLabel(restaurant.price_range)}</span>
          </div>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {restaurant.cuisine_type.slice(0, 2).map((c) => (
            <span
              key={c}
              className="rounded-md bg-[#EDE6D8] px-2 py-0.5 text-[11px] font-medium text-[#2C2420]"
            >
              {c}
            </span>
          ))}
          {restaurant.district && (
            <span className="text-[11px] text-[#8C7E72]">{restaurant.district}</span>
          )}
          {restaurant.google_rating != null && (
            <span className="text-[11px] text-[#8C7E72]">
              {restaurant.google_rating.toFixed(1)}★
              {restaurant.google_rating_count != null && (
                <span> ({restaurant.google_rating_count.toLocaleString()})</span>
              )}
            </span>
          )}
        </div>

        {subtitle && (
          <p className="mt-0.5 text-[11px] italic text-[#D44C2A]">{subtitle}</p>
        )}
      </div>
    </button>
  );
}
