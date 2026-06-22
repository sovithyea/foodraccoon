import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: restaurantId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await supabase
    .from("user_restaurants")
    .delete()
    .eq("user_id", user.id)
    .eq("restaurant_id", restaurantId);

  return NextResponse.json({ ok: true });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: restaurantId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let status: "want_to_try" | "visited" | "favourite" = "want_to_try";
  let rating: number | null = null;
  let review: string | null = null;

  try {
    const body = await request.json();
    if (
      body?.status === "visited" ||
      body?.status === "favourite" ||
      body?.status === "want_to_try"
    ) {
      status = body.status;
    }
    if (typeof body?.rating === "number" && body.rating >= 1 && body.rating <= 10) {
      rating = body.rating;
    }
    if (typeof body?.review === "string" && body.review.trim().length > 0) {
      review = body.review.trim();
    }
  } catch {
    // empty body is fine — defaults apply
  }

  const { data, error } = await supabase
    .from("user_restaurants")
    .upsert(
      { user_id: user.id, restaurant_id: restaurantId, status, rating, review },
      { onConflict: "user_id,restaurant_id" },
    )
    .select("id, status, rating, review")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, userRestaurant: data });
}
