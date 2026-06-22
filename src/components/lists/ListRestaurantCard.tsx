"use client"

import { X, Star } from "lucide-react"
import { priceLabel } from "@/lib/restaurants"
import { Button } from "@/components/ui/button"
import type { ListRestaurantDetail } from "@/lib/lists"

type Props = {
  item: ListRestaurantDetail
  onRemove?: () => void
  onClick: () => void
}

export function ListRestaurantCard({ item, onRemove, onClick }: Props) {
  const r = item.restaurant
  return (
    <div className="bg-card border-border flex items-center gap-3 rounded-xl border px-3 py-2.5">
      <button onClick={onClick} className="flex flex-1 items-center gap-3 text-left min-w-0">
        {r.cover_photo_url ? (
          <img src={r.cover_photo_url} alt="" width={56} height={56} className="size-14 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="bg-muted size-14 rounded-lg shrink-0 flex items-center justify-center text-2xl">🍴</div>
        )}
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{r.name}</p>
          <p className="text-xs text-muted-foreground">
            {[r.cuisine_type[0], r.district, priceLabel(r.price_range)].filter(Boolean).join(" · ")}
          </p>
          {item.user_rating !== null && (
            <p className="text-xs text-muted-foreground flex items-center gap-0.5 mt-0.5">
              <Star className="size-3 fill-amber-400 text-amber-400" />
              {item.user_rating}/10
            </p>
          )}
        </div>
      </button>
      {onRemove && (
        <Button variant="ghost" size="icon-sm" onClick={onRemove} className="shrink-0 text-muted-foreground hover:text-destructive">
          <X className="size-4" />
        </Button>
      )}
    </div>
  )
}
