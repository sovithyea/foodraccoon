import type { Tables } from "@/lib/database.types";

export type List = Tables<"lists">;

export type ListWithCount = List & {
  restaurant_count: number;
};

export type ListWithMembership = ListWithCount & {
  contains: boolean;
};

export type ListRestaurantDetail = {
  list_id: string;
  restaurant_id: string;
  added_at: string;
  note: string | null;
  position: number;
  user_rating: number | null;
  restaurant: {
    id: string;
    name: string;
    district: string | null;
    cuisine_type: string[];
    price_range: number | null;
    google_rating: number | null;
    cover_photo_url: string | null;
    google_place_id: string | null;
    latitude: number;
    longitude: number;
  };
};
