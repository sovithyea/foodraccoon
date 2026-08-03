import type { Tables } from "@/lib/database.types";

// The restaurant fields the Phase 1 map + panel actually need.
export type MapRestaurant = Pick<
  Tables<"restaurants">,
  | "id"
  | "name"
  | "address"
  | "district"
  | "google_place_id"
  | "latitude"
  | "longitude"
  | "cuisine_type"
  | "tags"
  | "price_range"
  | "google_rating"
  | "google_rating_count"
  | "cover_photo_url"
> & {
  opening_hours: { weekday_text: string[] } | null;
  saves_count: number;
};

export const PHNOM_PENH_CENTER: [number, number] = [104.9282, 11.5564]; // [lng, lat]
export const DEFAULT_ZOOM = 12.5;

export function priceLabel(range: number | null): string {
  if (!range) return "—";
  return "$".repeat(Math.min(Math.max(range, 1), 4));
}

// cover_photo_url stores a bare Places API (New) photo reference (never the
// API key) — this proxies it through /api/photos so the key stays server-side.
// The new Places photo media endpoint needs both the place id and the photo
// reference to build its resource path (places/{placeId}/photos/{ref}/media).
export function coverPhotoSrc(placeId: string | null, ref: string | null): string | null {
  if (!ref || !placeId) return null;
  return `/api/photos?placeId=${encodeURIComponent(placeId)}&ref=${encodeURIComponent(ref)}`;
}
