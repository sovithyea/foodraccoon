"use client";

import { useEffect } from "react";
import { useMapStore, RESTAURANTS_TTL, type RestaurantStatus } from "@/store/mapStore";
import type { MapRestaurant } from "@/lib/restaurants";
import { RestaurantMap } from "./RestaurantMap";
import { FilterBar } from "./FilterBar";
import { RestaurantPanel } from "./RestaurantPanel";
import { DirectionsPanel } from "./DirectionsPanel";
import { MapStylePicker } from "./MapStylePicker";

export function MapView({
  statuses,
}: {
  statuses: { restaurantId: string; status: RestaurantStatus }[];
}) {
  const setStatuses = useMapStore((s) => s.setStatuses);
  const setRestaurants = useMapStore((s) => s.setRestaurants);

  useEffect(() => {
    setStatuses(statuses);
  }, [setStatuses, statuses]);

  useEffect(() => {
    // Skip fetch if cached restaurants are still fresh (< 30 min old).
    const { restaurants, lastFetched } = useMapStore.getState();
    if (
      lastFetched !== null &&
      Date.now() - lastFetched < RESTAURANTS_TTL &&
      restaurants.length > 0
    ) {
      return;
    }

    let cancelled = false;
    fetch("/api/restaurants")
      .then((r) => r.json())
      .then((data: MapRestaurant[]) => {
        if (!cancelled && Array.isArray(data)) setRestaurants(data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [setRestaurants]);

  return (
    <div className="fixed inset-0">
      <RestaurantMap />
      <FilterBar />
      <MapStylePicker />
      <RestaurantPanel />
      <DirectionsPanel />
    </div>
  );
}
