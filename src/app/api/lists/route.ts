import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([])

  const { searchParams } = new URL(request.url)
  const restaurantId = searchParams.get("restaurantId")

  const { data: lists, error } = await supabase
    .from("lists")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const listIds = lists.map((l) => l.id)

  const { data: memberRows } = await supabase
    .from("list_restaurants")
    .select("list_id")
    .in("list_id", listIds.length ? listIds : ["__none__"])

  const countMap = new Map<string, number>()
  for (const row of memberRows ?? []) {
    countMap.set(row.list_id, (countMap.get(row.list_id) ?? 0) + 1)
  }

  const withCount = lists.map((l) => ({ ...l, restaurant_count: countMap.get(l.id) ?? 0 }))

  if (restaurantId) {
    const { data: memberships } = await supabase
      .from("list_restaurants")
      .select("list_id")
      .eq("restaurant_id", restaurantId)
      .in("list_id", listIds.length ? listIds : ["__none__"])

    const memberSet = new Set((memberships ?? []).map((m) => m.list_id))
    return NextResponse.json(withCount.map((l) => ({ ...l, contains: memberSet.has(l.id) })))
  }

  return NextResponse.json(withCount)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { title, emoji, description, is_public } = body
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 })

  const slug = slugify(title.trim())

  const { data, error } = await supabase
    .from("lists")
    .insert({ title: title.trim(), emoji: emoji ?? null, description: description ?? null,
               is_public: is_public ?? false, user_id: user.id, slug })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ...data, restaurant_count: 0 })
}
