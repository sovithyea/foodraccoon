import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { MapRestaurant } from "@/lib/restaurants";

const RESTAURANT_SELECT =
  "id, name, address, district, google_place_id, latitude, longitude, cuisine_type, tags, price_range, google_rating, google_rating_count, cover_photo_url";
const PAGE_SIZE = 1000;

export async function GET() {
  const supabase = await createClient();

  // PostgREST max_rows is 1000 — paginate in parallel to fetch all restaurants.
  const { count } = await supabase
    .from("restaurants")
    .select("*", { count: "exact", head: true });

  const totalPages = Math.ceil((count ?? PAGE_SIZE) / PAGE_SIZE);
  const pages = Array.from({ length: totalPages }, (_, i) => i);

  const restaurantPages = await Promise.all(
    pages.map((i) =>
      supabase
        .from("restaurants")
        .select(RESTAURANT_SELECT)
        .order("name")
        .range(i * PAGE_SIZE, (i + 1) * PAGE_SIZE - 1),
    ),
  );

  const restaurants = restaurantPages.flatMap(
    (p) => (p.data ?? []) as MapRestaurant[],
  );

  return NextResponse.json(restaurants);
}
