import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; rid: string }> }
) {
  const { id, rid } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: list } = await supabase
    .from("lists")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { error } = await supabase
    .from("list_restaurants")
    .delete()
    .eq("list_id", id)
    .eq("restaurant_id", rid)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
