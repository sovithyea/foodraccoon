import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { inferCuisineTypes, inferDistrict, mapPriceLevel } from "@/lib/places";
import { checkOrigin } from "@/lib/request-guard";

const adminDb = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY!;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!checkOrigin(_req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: suggestion, error: fetchError } = await adminDb
    .from("suggestions")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !suggestion) {
    return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
  }

  const queryParts = [suggestion.name, suggestion.address, "Phnom Penh Cambodia"].filter(Boolean);
  const query = queryParts.join(" ");

  const searchParams = new URLSearchParams({ query, key: GOOGLE_API_KEY, region: "kh" });
  const searchRes = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?${searchParams}`,
  );
  const searchData = await searchRes.json();

  if (searchData.status !== "OK" || !searchData.results?.[0]) {
    return NextResponse.json(
      { error: "No Google Places result found for this suggestion", code: "NO_RESULT" },
      { status: 404 },
    );
  }

  const topResult = searchData.results[0];

  const detailsParams = new URLSearchParams({
    place_id: topResult.place_id,
    fields: [
      "place_id", "name", "formatted_address", "formatted_phone_number",
      "website", "opening_hours", "photos", "price_level", "rating",
      "user_ratings_total", "geometry", "types",
    ].join(","),
    key: GOOGLE_API_KEY,
  });

  const detailsRes = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${detailsParams}`,
  );
  const detailsData = await detailsRes.json();
  const details = detailsData.result;

  if (!details) {
    return NextResponse.json({ error: "Could not fetch place details" }, { status: 500 });
  }

  const { lat, lng } = details.geometry.location;

  const cuisineTypes = suggestion.cuisine
    ? [suggestion.cuisine]
    : inferCuisineTypes(details.types ?? [], details.name);

  const row = {
    google_place_id: details.place_id,
    name: details.name,
    address: details.formatted_address,
    district: inferDistrict(lat, lng),
    latitude: lat,
    longitude: lng,
    cuisine_type: cuisineTypes,
    tags: [] as string[],
    price_range: mapPriceLevel(details.price_level),
    google_rating: details.rating ?? null,
    google_rating_count: details.user_ratings_total ?? null,
    cover_photo_url: details.photos?.[0]?.photo_reference ?? null,
    phone: details.formatted_phone_number ?? null,
    website: details.website ?? null,
    opening_hours: details.opening_hours?.weekday_text
      ? { weekday_text: details.opening_hours.weekday_text }
      : null,
  };

  const { data: restaurant, error: upsertError } = await adminDb
    .from("restaurants")
    .upsert(row, { onConflict: "google_place_id" })
    .select()
    .single();

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  await adminDb
    .from("suggestions")
    .update({ status: "imported", imported_restaurant_id: restaurant.id })
    .eq("id", id);

  return NextResponse.json({
    success: true,
    restaurant,
    message: `Imported: ${restaurant.name}`,
  });
}
