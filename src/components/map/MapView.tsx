"use client";

import { useEffect } from "react";
import { useMapStore, type RestaurantStatus } from "@/store/mapStore";
import type { MapRestaurant } from "@/lib/restaurants";
import { RestaurantMap } from "./RestaurantMap";
import { FilterBar } from "./FilterBar";
import { RestaurantPanel } from "./RestaurantPanel";
import { DirectionsPanel } from "./DirectionsPanel";

export function MapView({
  restaurants,
  statuses,
}: {
  restaurants: MapRestaurant[];
  statuses: { restaurantId: string; status: RestaurantStatus }[];
}) {
  const init = useMapStore((s) => s.init);

  useEffect(() => {
    init(restaurants, statuses);
  }, [init, restaurants, statuses]);

  return (
    <div className="relative h-full w-full">
      <RestaurantMap />
      <FilterBar />
      <RestaurantPanel />
      <DirectionsPanel />
    </div>
  );
}
