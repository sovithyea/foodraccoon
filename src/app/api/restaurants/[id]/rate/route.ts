import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseBody, checkOrigin, BadRequest } from "@/lib/request-guard";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!checkOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
  if (!checkOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: restaurantId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const fields: {
    status?: "want_to_try" | "visited" | "favourite";
    rating?: number | null;
    review?: string | null;
  } = {};

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const parsed = await parseBody<{
      status?: string;
      rating?: number;
      review?: string;
    }>(request, ["status", "rating", "review"]);

    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    if (body.status !== undefined) {
      if (body.status !== "visited" && body.status !== "favourite" && body.status !== "want_to_try") {
        return BadRequest("status must be one of: want_to_try, visited, favourite");
      }
      fields.status = body.status;
    }
    if (body.rating !== undefined) {
      if (typeof body.rating !== "number" || body.rating < 1 || body.rating > 10) {
        return BadRequest("rating must be a number between 1 and 10");
      }
      fields.rating = body.rating;
    }
    if (body.review !== undefined) {
      if (body.review !== null) {
        if (typeof body.review !== "string") return BadRequest("review must be a string");
        const trimmed = body.review.trim();
        if (trimmed.length > 1000) return BadRequest("review must be at most 1000 characters");
        fields.review = trimmed.length > 0 ? trimmed : null;
      } else {
        fields.review = null;
      }
    }
  }

  const { data: existing } = await supabase
    .from("user_restaurants")
    .select("id")
    .eq("user_id", user.id)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  const { data, error } = existing
    ? await supabase
        .from("user_restaurants")
        .update(fields)
        .eq("id", existing.id)
        .select("id, status, rating, review")
        .single()
    : await supabase
        .from("user_restaurants")
        .insert({ user_id: user.id, restaurant_id: restaurantId, status: "want_to_try", ...fields })
        .select("id, status, rating, review")
        .single();

  if (error) return NextResponse.json({ error: "Failed to save rating" }, { status: 400 });
  return NextResponse.json({ ok: true, userRestaurant: data });
}
