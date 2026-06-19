import { createClient } from "@/lib/supabase/server";
import { MapView } from "@/components/map/MapView";
import type { MapRestaurant } from "@/lib/restaurants";
import type { RestaurantStatus } from "@/store/mapStore";

export default async function MapPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: restaurants }, { data: userStatuses }] = await Promise.all([
    supabase
      .from("restaurants")
      .select(
        "id, name, address, district, latitude, longitude, cuisine_type, tags, price_range, google_rating, cover_photo_url",
      )
      .order("name"),
    user
      ? supabase
          .from("user_restaurants")
          .select("restaurant_id, status")
          .eq("user_id", user.id)
      : Promise.resolve({ data: [] }),
  ]);

  const statuses = (userStatuses ?? [])
    .filter((r) => r.status != null)
    .map((r) => ({
      restaurantId: r.restaurant_id,
      status: r.status as RestaurantStatus,
    }));

  return (
    <MapView
      restaurants={(restaurants as MapRestaurant[]) ?? []}
      statuses={statuses}
    />
  );
}
