import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string; slug: string }> }
) {
  const { username, slug } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("username", username)
    .single()

  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { data: list } = await supabase
    .from("lists")
    .select("*")
    .eq("user_id", profile.id)
    .eq("slug", slug)
    .eq("is_public", true)
    .single()

  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { data: rows } = await supabase
    .from("list_restaurants")
    .select("restaurant_id, added_at, restaurants(id, name, district, cuisine_type, price_range, google_rating, cover_photo_url, latitude, longitude)")
    .eq("list_id", list.id)
    .order("added_at", { ascending: false })

  return NextResponse.json({ list, profile, restaurants: rows ?? [] })
}
