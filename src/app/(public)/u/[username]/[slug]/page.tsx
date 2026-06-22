import { notFound } from "next/navigation"
import Link from "next/link"
import { priceLabel } from "@/lib/restaurants"
import { Button } from "@/components/ui/button"
import type { Metadata } from "next"

type Params = { username: string; slug: string }

type PublicListData = {
  list: {
    id: string; title: string; emoji: string | null; description: string | null;
    is_public: boolean; restaurant_count: number;
  }
  profile: { username: string | null; display_name: string | null }
  restaurants: Array<{
    restaurant_id: string
    added_at: string
    restaurants: {
      id: string; name: string; district: string | null; cuisine_type: string[];
      price_range: number | null; google_rating: number | null; cover_photo_url: string | null;
    } | null
  }>
}

async function fetchList(username: string, slug: string): Promise<PublicListData | null> {
  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000"
  const res = await fetch(`${base}/api/lists/user/${username}/${slug}`, { cache: "no-store" })
  if (!res.ok) return null
  return res.json()
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { username, slug } = await params
  const data = await fetchList(username, slug)
  if (!data) return { title: "List not found — FoodRaccoon" }
  return {
    title: `${data.list.emoji ?? ""} ${data.list.title} by @${username} — FoodRaccoon`,
    description: data.list.description ?? `A restaurant list by @${username} on FoodRaccoon`,
  }
}

export default async function PublicListPage({ params }: { params: Promise<Params> }) {
  const { username, slug } = await params
  const data = await fetchList(username, slug)
  if (!data) notFound()

  const { list, profile, restaurants } = data
  const displayName = profile.display_name ?? `@${username}`

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-4 py-3">
        <Link href="/" className="text-primary text-sm font-bold tracking-tight">
          foodraccoon
        </Link>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 space-y-6">
        <div>
          <p className="text-4xl mb-2">{list.emoji ?? "📋"}</p>
          <h1 className="text-2xl font-bold">{list.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            by {displayName} · {restaurants.length} {restaurants.length === 1 ? "place" : "places"}
          </p>
          {list.description && (
            <p className="text-sm text-muted-foreground mt-2">{list.description}</p>
          )}
        </div>

        <ul className="space-y-3">
          {restaurants.map(({ restaurant_id, restaurants: r }) => {
            if (!r) return null
            return (
              <li key={restaurant_id} className="bg-card border-border flex items-center gap-3 rounded-xl border p-3">
                {r.cover_photo_url ? (
                  <img src={r.cover_photo_url} alt="" width={56} height={56} className="size-14 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="bg-muted size-14 rounded-lg shrink-0 flex items-center justify-center text-2xl">🍴</div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[r.cuisine_type[0], r.district, priceLabel(r.price_range)].filter(Boolean).join(" · ")}
                  </p>
                  {r.google_rating && (
                    <p className="text-xs text-muted-foreground">★ {r.google_rating.toFixed(1)}</p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

        <div className="space-y-2 pt-2">
          <Link href="/">
            <Button className="w-full">Open in FoodRaccoon</Button>
          </Link>
          <Button variant="outline" className="w-full" disabled>
            Save this list (coming soon)
          </Button>
        </div>
      </main>
    </div>
  )
}
