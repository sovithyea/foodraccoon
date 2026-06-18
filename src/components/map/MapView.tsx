"use client";

import { useEffect } from "react";
import { useMapStore } from "@/store/mapStore";
import type { MapRestaurant } from "@/lib/restaurants";
import { RestaurantMap } from "./RestaurantMap";
import { FilterBar } from "./FilterBar";
import { RestaurantPanel } from "./RestaurantPanel";
import { DirectionsPanel } from "./DirectionsPanel";

export function MapView({
  restaurants,
  savedIds,
}: {
  restaurants: MapRestaurant[];
  savedIds: string[];
}) {
  const init = useMapStore((s) => s.init);

  useEffect(() => {
    init(restaurants, savedIds);
  }, [init, restaurants, savedIds]);

  return (
    <div className="relative h-full w-full">
      <RestaurantMap />
      <FilterBar />
      <RestaurantPanel />
      <DirectionsPanel />
    </div>
  );
}
