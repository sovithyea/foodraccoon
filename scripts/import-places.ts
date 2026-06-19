/**
 * Populates the `restaurants` table from Google Places API.
 * Sweeps Phnom Penh by district × keyword to collect 500–1,000 unique places.
 *
 * Run with:
 *   npx tsx scripts/import-places.ts
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   GOOGLE_PLACES_API_KEY
 *
 * Safe to re-run — upserts on google_place_id, no duplicates created.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/database.types";

// ---------------------------------------------------------------------------
// Env loader (mirrors seed.ts)
// ---------------------------------------------------------------------------

function loadEnv() {
  try {
    const raw = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    // env may already be set in shell
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PlaceResult = {
  place_id: string;
  name: string;
  business_status?: string;
};

type PlaceDetails = {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  opening_hours?: { weekday_text: string[] };
  photos?: { photo_reference: string }[];
  price_level?: number;
  rating?: number;
  geometry: { location: { lat: number; lng: number } };
  types: string[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function mapPriceLevel(level?: number): number | null {
  if (level == null) return null;
  return Math.max(1, Math.min(4, level));
}

function inferCuisineTypes(types: string[], name: string): string[] {
  const cuisines: string[] = [];
  const nameLower = name.toLowerCase();

  const typeMap: Record<string, string> = {
    cafe: "Cafe",
    bakery: "Cafe",
    bar: "Bar",
    night_club: "Bar",
    meal_takeaway: "Street food",
    meal_delivery: "Street food",
  };
  const nameMap: Record<string, string> = {
    pizza: "Pizza",
    sushi: "Japanese",
    ramen: "Japanese",
    burger: "Western",
    steak: "Western",
    grill: "Western",
    khmer: "Khmer",
    cambodia: "Khmer",
    pho: "Vietnamese",
    viet: "Vietnamese",
    thai: "Thai",
    indian: "Indian",
    italian: "Italian",
    pasta: "Italian",
    coffee: "Cafe",
    cafe: "Cafe",
    bakery: "Cafe",
    noodle: "Noodles",
    vegan: "Vegan",
    vegetarian: "Vegetarian",
    chinese: "Chinese",
    korean: "Korean",
    asian: "Asian",
    bbq: "BBQ",
    seafood: "Seafood",
  };

  for (const [key, val] of Object.entries(typeMap)) {
    if (types.includes(key) && !cuisines.includes(val)) cuisines.push(val);
  }
  for (const [key, val] of Object.entries(nameMap)) {
    if (nameLower.includes(key) && !cuisines.includes(val)) cuisines.push(val);
  }

  if (cuisines.length === 0) cuisines.push("International");
  return cuisines;
}

function inferDistrict(lat: number, lng: number): string {
  if (lng > 104.925 && lat > 11.565) return "Riverside";
  if (lng > 104.915 && lng < 104.930 && lat > 11.555 && lat < 11.575) return "BKK1";
  if (lng > 104.910 && lng < 104.925 && lat > 11.550 && lat < 11.565) return "BKK2";
  if (lat < 11.545 && lng > 104.910) return "Chamkarmon";
  if (lat > 11.575 && lng < 104.915) return "Toul Kork";
  if (lng < 104.900) return "Sen Sok";
  if (lat > 11.560 && lng > 104.925) return "Daun Penh";
  if (lat < 11.535) return "Mean Chey";
  return "Toul Tom Poung";
}

function photoUrl(photoRef: string, apiKey: string): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${apiKey}`;
}

// ---------------------------------------------------------------------------
// API calls (legacy Places API — wide support, no headers required)
// ---------------------------------------------------------------------------

async function nearbySearch(
  lat: number,
  lng: number,
  keyword: string,
  apiKey: string,
  pageToken?: string,
): Promise<{ results: PlaceResult[]; nextPageToken?: string }> {
  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    radius: "1500",
    type: "restaurant",
    keyword,
    key: apiKey,
    ...(pageToken ? { pagetoken: pageToken } : {}),
  });

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`,
  );
  const data = await res.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error(`  Nearby search error [${data.status}]:`, data.error_message ?? "");
    return { results: [] };
  }

  return {
    results: (data.results ?? []).filter(
      (r: PlaceResult) => r.business_status !== "CLOSED_PERMANENTLY",
    ),
    nextPageToken: data.next_page_token,
  };
}

async function getPlaceDetails(
  placeId: string,
  apiKey: string,
): Promise<PlaceDetails | null> {
  const fields = [
    "place_id",
    "name",
    "formatted_address",
    "formatted_phone_number",
    "website",
    "opening_hours",
    "photos",
    "price_level",
    "rating",
    "geometry",
    "types",
  ].join(",");

  const params = new URLSearchParams({ place_id: placeId, fields, key: apiKey });
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${params}`,
  );
  const data = await res.json();

  if (data.status !== "OK") {
    console.warn(`  Details failed [${data.status}] for ${placeId}`);
    return null;
  }

  return data.result as PlaceDetails;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run() {
  loadEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  if (!apiKey) {
    console.error("Missing GOOGLE_PLACES_API_KEY");
    process.exit(1);
  }

  const supabase = createClient<Database>(supabaseUrl, serviceKey);

  const DISTRICTS = [
    { name: "BKK1",           lat: 11.5596, lng: 104.9218 },
    { name: "BKK2",           lat: 11.5650, lng: 104.9180 },
    { name: "Riverside",      lat: 11.5693, lng: 104.9308 },
    { name: "Toul Tom Poung", lat: 11.5510, lng: 104.9180 },
    { name: "Daun Penh",      lat: 11.5710, lng: 104.9270 },
    { name: "Chamkarmon",     lat: 11.5480, lng: 104.9220 },
    { name: "Toul Kork",      lat: 11.5810, lng: 104.9100 },
    { name: "Sen Sok",        lat: 11.5950, lng: 104.8950 },
    { name: "Mean Chey",      lat: 11.5300, lng: 104.9200 },
    { name: "Chroy Changvar", lat: 11.5900, lng: 104.9450 },
  ];

  const KEYWORDS = [
    "restaurant",
    "cafe",
    "coffee",
    "khmer food",
    "street food",
    "pizza",
    "burger",
    "noodles",
    "bar",
    "bakery",
  ];

  // Step 1: collect all place IDs via nearby search sweeps
  const placeIds = new Set<string>();

  for (const district of DISTRICTS) {
    for (const keyword of KEYWORDS) {
      process.stdout.write(`Searching ${district.name} + "${keyword}"... `);

      let pageToken: string | undefined;
      let page = 0;
      let found = 0;

      do {
        if (pageToken) await sleep(2000); // Google requires ~2s before using a page token
        const { results, nextPageToken } = await nearbySearch(
          district.lat,
          district.lng,
          keyword,
          apiKey,
          pageToken,
        );
        results.forEach((r) => placeIds.add(r.place_id));
        found += results.length;
        pageToken = nextPageToken;
        page++;
        await sleep(150);
      } while (pageToken && page < 3);

      console.log(`${found} results (${placeIds.size} unique total)`);
    }
  }

  console.log(`\n→ ${placeIds.size} unique places found. Fetching details...\n`);

  // Step 2: fetch full details and upsert to Supabase
  let imported = 0;
  let skipped = 0;
  let failed = 0;
  const ids = [...placeIds];

  for (let i = 0; i < ids.length; i++) {
    const placeId = ids[i];
    const details = await getPlaceDetails(placeId, apiKey);
    await sleep(100);

    if (!details) {
      skipped++;
      continue;
    }

    const { lat, lng } = details.geometry.location;

    // Drop anything clearly outside Phnom Penh
    if (lat < 11.45 || lat > 11.65 || lng < 104.80 || lng > 105.05) {
      skipped++;
      continue;
    }

    const row = {
      google_place_id: details.place_id,
      name: details.name,
      address: details.formatted_address,
      district: inferDistrict(lat, lng),
      latitude: lat,
      longitude: lng,
      cuisine_type: inferCuisineTypes(details.types, details.name),
      tags: [] as string[],
      price_range: mapPriceLevel(details.price_level),
      google_rating: details.rating ?? null,
      cover_photo_url: details.photos?.[0]
        ? photoUrl(details.photos[0].photo_reference, apiKey)
        : null,
      phone: details.formatted_phone_number ?? null,
      website: details.website ?? null,
      opening_hours: details.opening_hours?.weekday_text
        ? { weekday_text: details.opening_hours.weekday_text }
        : null,
    };

    const { error } = await supabase
      .from("restaurants")
      .upsert(row, { onConflict: "google_place_id", ignoreDuplicates: false });

    if (error) {
      console.error(`  ✗ ${details.name}: ${error.message}`);
      failed++;
    } else {
      console.log(`  [${i + 1}/${ids.length}] ✓ ${details.name} (${row.district})`);
      imported++;
    }
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Import complete
   Imported : ${imported}
   Skipped  : ${skipped}
   Failed   : ${failed}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
