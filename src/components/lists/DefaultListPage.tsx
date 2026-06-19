"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Map } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useMapStore } from "@/store/mapStore"
import { priceLabel } from "@/lib/restaurants"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

type Entry = {
  restaurant_id: string
  restaurants: {
    id: string
    name: string
    district: string | null
    cuisine_type: string[]
    price_range: number | null
    cover_photo_url: string | null
  } | null
}

const CONFIG = {
  want_to_try: { title: "Want to Try", emoji: "🕐", status: "want_to_try" as const },
  visited:     { title: "Visited",     emoji: "✅", status: "visited" as const },
  favourite:   { title: "Favourites",  emoji: "⭐", status: "favourite" as const },
}

export function DefaultListPage({ status }: { status: keyof typeof CONFIG }) {
  const { title, emoji } = CONFIG[status]
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const select = useMapStore((s) => s.select)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from("user_restaurants")
        .select("restaurant_id, restaurants(id, name, district, cuisine_type, price_range, cover_photo_url)")
        .eq("user_id", user.id)
        .eq("status", status)
        .order("created_at", { ascending: false })
      setEntries((data as Entry[]) ?? [])
      setLoading(false)
    })
  }, [status])

  function openOnMap(id: string) {
    select(id)
    router.push("/")
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Link href="/lists">
          <Button variant="ghost" size="icon-sm"><ArrowLeft className="size-4" /></Button>
        </Link>
        <h1 className="text-base font-semibold">{emoji} {title}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
          </div>
        )}

        {!loading && entries.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <span className="text-4xl">{emoji}</span>
            <p className="text-sm text-muted-foreground max-w-xs">
              Nothing here yet — save some restaurants from the map.
            </p>
            <Link href="/">
              <Button variant="outline" size="sm"><Map className="size-4" /> Open map</Button>
            </Link>
          </div>
        )}

        {!loading && entries.length > 0 && (
          <ul className="space-y-2">
            {entries.map(({ restaurant_id, restaurants: r }) => {
              if (!r) return null
              return (
                <li key={restaurant_id}>
                  <button
                    onClick={() => openOnMap(r.id)}
                    className="bg-card border-border hover:bg-accent/30 flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors"
                  >
                    {r.cover_photo_url ? (
                      <img src={r.cover_photo_url} alt="" className="size-12 rounded-md object-cover shrink-0" />
                    ) : (
                      <div className="bg-muted size-12 rounded-md shrink-0 flex items-center justify-center text-xl">🍴</div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[r.cuisine_type[0], r.district, priceLabel(r.price_range)].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
