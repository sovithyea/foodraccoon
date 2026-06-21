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
};

export const PHNOM_PENH_CENTER: [number, number] = [104.9282, 11.5564]; // [lng, lat]
export const DEFAULT_ZOOM = 12.5;

export function priceLabel(range: number | null): string {
  if (!range) return "—";
  return "$".repeat(Math.min(Math.max(range, 1), 4));
}
