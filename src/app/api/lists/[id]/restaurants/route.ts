import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: list } = await supabase
    .from("lists")
    .select("id, is_public, user_id")
    .eq("id", id)
    .single()

  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!list.is_public && list.user_id !== user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data: rows } = await supabase
    .from("list_restaurants")
    .select("list_id, restaurant_id, added_at, note, position, restaurants(id, name, district, cuisine_type, price_range, google_rating, cover_photo_url, latitude, longitude)")
    .eq("list_id", id)
    .order("added_at", { ascending: false })

  const restaurantIds = (rows ?? []).map((r) => r.restaurant_id)
  const userRatings = new Map<string, number | null>()

  if (user && restaurantIds.length) {
    const { data: ratings } = await supabase
      .from("user_restaurants")
      .select("restaurant_id, rating")
      .eq("user_id", user.id)
      .in("restaurant_id", restaurantIds)
    for (const r of ratings ?? []) userRatings.set(r.restaurant_id, r.rating)
  }

  const result = (rows ?? []).map(({ restaurants, ...row }) => ({
    ...row,
    restaurant: restaurants,
    user_rating: userRatings.get(row.restaurant_id) ?? null,
  }))

  return NextResponse.json(result)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { restaurantId } = await request.json()
  if (!restaurantId) return NextResponse.json({ error: "restaurantId required" }, { status: 400 })

  const { data: list } = await supabase
    .from("lists")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { error } = await supabase
    .from("list_restaurants")
    .upsert(
      { list_id: id, restaurant_id: restaurantId, position: 0 },
      { onConflict: "list_id,restaurant_id" }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
