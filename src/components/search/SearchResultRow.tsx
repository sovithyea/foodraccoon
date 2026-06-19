"use client";

import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { priceLabel } from "@/lib/restaurants";
import { formatDistance } from "@/lib/geo";
import type { SearchResult } from "@/lib/search";

export function SearchResultRow({
  restaurant,
  subtitle,
  distanceMetres,
  onSelect,
}: {
  restaurant: SearchResult;
  subtitle?: string;
  distanceMetres?: number;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="hover:bg-muted/50 flex w-full items-start gap-3 px-4 py-3 text-left transition-colors"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate font-medium">{restaurant.name}</span>
          <div className="text-muted-foreground flex shrink-0 items-center gap-2 text-xs">
            {distanceMetres !== undefined && (
              <span>{formatDistance(distanceMetres)}</span>
            )}
            <span>{priceLabel(restaurant.price_range)}</span>
          </div>
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {restaurant.cuisine_type.slice(0, 2).map((c) => (
            <Badge key={c} variant="secondary" className="text-xs">
              {c}
            </Badge>
          ))}
          {restaurant.district && (
            <span className="text-muted-foreground text-xs">{restaurant.district}</span>
          )}
          {restaurant.google_rating != null && (
            <span className="text-muted-foreground inline-flex items-center gap-0.5 text-xs">
              <Star className="size-3 fill-amber-400 text-amber-400" />
              {restaurant.google_rating.toFixed(1)}
            </span>
          )}
        </div>

        {subtitle && (
          <p className="text-muted-foreground mt-0.5 text-xs">{subtitle}</p>
        )}
      </div>
    </button>
  );
}
