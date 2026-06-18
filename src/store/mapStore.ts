import { create } from "zustand";
import type { MapRestaurant } from "@/lib/restaurants";

export type RouteStep = {
  instruction: string;
  distance: number;
  duration: number;
  type: string;
};

export type ActiveRoute = {
  geometry: GeoJSON.LineString;
  steps: RouteStep[];
  distance: number;
  duration: number;
  profile: "walking" | "driving";
  restaurantName: string;
  restaurantId: string;
} | null;

export type MapState = {
  restaurants: MapRestaurant[];
  savedIds: Set<string>;
  selectedId: string | null;

  // Filters
  cuisines: Set<string>;
  prices: Set<number>;

  // Directions
  activeRoute: ActiveRoute;
  userLocation: [number, number] | null;

  // Actions
  init: (restaurants: MapRestaurant[], savedIds: string[]) => void;
  select: (id: string | null) => void;
  toggleCuisine: (c: string) => void;
  togglePrice: (p: number) => void;
  clearFilters: () => void;
  markSaved: (id: string) => void;
  setRoute: (route: ActiveRoute) => void;
  clearRoute: () => void;
  setUserLocation: (coords: [number, number]) => void;
};

export const useMapStore = create<MapState>((set) => ({
  restaurants: [],
  savedIds: new Set(),
  selectedId: null,
  cuisines: new Set(),
  prices: new Set(),
  activeRoute: null,
  userLocation: null,

  init: (restaurants, savedIds) =>
    set({ restaurants, savedIds: new Set(savedIds) }),

  select: (id) => set({ selectedId: id }),

  toggleCuisine: (c) =>
    set((s) => {
      const next = new Set(s.cuisines);
      next.has(c) ? next.delete(c) : next.add(c);
      return { cuisines: next };
    }),

  togglePrice: (p) =>
    set((s) => {
      const next = new Set(s.prices);
      next.has(p) ? next.delete(p) : next.add(p);
      return { prices: next };
    }),

  clearFilters: () => set({ cuisines: new Set(), prices: new Set() }),

  markSaved: (id) =>
    set((s) => {
      const next = new Set(s.savedIds);
      next.add(id);
      return { savedIds: next };
    }),

  setRoute: (route) => set({ activeRoute: route }),
  clearRoute: () => set({ activeRoute: null, userLocation: null }),
  setUserLocation: (coords) => set({ userLocation: coords }),
}));

export function filterRestaurants(s: MapState): MapRestaurant[] {
  return s.restaurants.filter((r) => {
    const cuisineOk =
      s.cuisines.size === 0 ||
      r.cuisine_type.some((c) => s.cuisines.has(c));
    const priceOk =
      s.prices.size === 0 ||
      (r.price_range !== null && s.prices.has(r.price_range));
    return cuisineOk && priceOk;
  });
}
