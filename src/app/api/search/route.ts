import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SearchResult, SearchResponse } from "@/lib/search";

const RESTAURANT_COLS =
  "id, name, address, district, latitude, longitude, cuisine_type, tags, price_range, google_rating";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json<SearchResponse>({
      restaurants: [],
      cuisineMatches: [],
      districtMatches: [],
      dishMatches: [],
    });
  }

  const supabase = await createClient();
  const pattern = `%${q}%`;

  // Run name, district, all-restaurants (for cuisine/tag filter), and dish queries in parallel
  const [nameRes, districtRes, allRes, dishRes] = await Promise.all([
    supabase
      .from("restaurants")
      .select(RESTAURANT_COLS)
      .ilike("name", pattern)
      .order("name")
      .limit(10),

    supabase
      .from("restaurants")
      .select(RESTAURANT_COLS)
      .ilike("district", pattern)
      .order("name")
      .limit(15),

    supabase
      .from("restaurants")
      .select(RESTAURANT_COLS)
      .order("name"),

    supabase
      .from("dishes")
      .select("restaurant_id, name")
      .ilike("name", pattern)
      .limit(10),
  ]);

  const nameMatches: SearchResult[] = (nameRes.data ?? []) as SearchResult[];
  const nameIds = new Set(nameMatches.map((r) => r.id));

  // Filter cuisine/tags in JS — supports partial ilike matching on array elements
  const qLower = q.toLowerCase();
  const cuisineMatches: SearchResult[] = ((allRes.data ?? []) as SearchResult[])
    .filter(
      (r) =>
        !nameIds.has(r.id) &&
        (r.cuisine_type.some((c) => c.toLowerCase().includes(qLower)) ||
          ((r as unknown as { tags: string[] }).tags ?? []).some((t) =>
            t.toLowerCase().includes(qLower),
          )),
    )
    .slice(0, 15)
    .map((r) => ({
      ...r,
      matchedCuisine:
        r.cuisine_type.find((c) => c.toLowerCase().includes(qLower)) ??
        ((r as unknown as { tags: string[] }).tags ?? []).find((t) =>
          t.toLowerCase().includes(qLower),
        ),
    }));
  const cuisineIds = new Set(cuisineMatches.map((r) => r.id));

  // Dish matches — fetch the restaurant rows for the matched dish restaurant_ids
  const dishRestaurantIds = [...new Set((dishRes.data ?? []).map((d) => d.restaurant_id))];
  let dishMatches: SearchResult[] = [];
  if (dishRestaurantIds.length > 0) {
    const { data: dishRestaurants } = await supabase
      .from("restaurants")
      .select(RESTAURANT_COLS)
      .in("id", dishRestaurantIds);

    dishMatches = (dishRestaurants ?? [])
      .filter((r) => !nameIds.has(r.id) && !cuisineIds.has(r.id))
      .map((r) => ({
        ...(r as SearchResult),
        matchedDish: (dishRes.data ?? []).find((d) => d.restaurant_id === r.id)?.name,
      }));
  }
  const dishIds = new Set(dishMatches.map((r) => r.id));

  // District matches — exclude already-seen IDs
  const districtMatches: SearchResult[] = ((districtRes.data ?? []) as SearchResult[]).filter(
    (r) => !nameIds.has(r.id) && !cuisineIds.has(r.id) && !dishIds.has(r.id),
  );

  return NextResponse.json<SearchResponse>({
    restaurants: nameMatches,
    cuisineMatches,
    districtMatches,
    dishMatches,
  });
}
