import { createClient } from "@/lib/supabase/server";
import { MapView } from "@/components/map/MapView";
import type { RestaurantStatus } from "@/store/mapStore";

export default async function MapPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Restaurants are fetched client-side (cached in Zustand). Only the small,
  // per-user status set is fetched here on the server (auth-dependent).
  const { data: userStatuses } = user
    ? await supabase
        .from("user_restaurants")
        .select("restaurant_id, status")
        .eq("user_id", user.id)
    : { data: [] };

  const statuses = (userStatuses ?? [])
    .filter((r) => r.status != null)
    .map((r) => ({
      restaurantId: r.restaurant_id,
      status: r.status as RestaurantStatus,
    }));

  return <MapView statuses={statuses} />;
}
