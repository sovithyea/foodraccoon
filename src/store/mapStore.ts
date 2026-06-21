import { create } from "zustand";
import type { MapRestaurant } from "@/lib/restaurants";
import { haversineDistance } from "@/lib/geo";
import { isOpenNow } from "@/lib/openNow";

export type RestaurantStatus = "want_to_try" | "visited" | "favourite";

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
  lastFetched: number | null;
  statusMap: Map<string, RestaurantStatus>;
  selectedId: string | null;

  // Filters
  cuisines: Set<string>;
  prices: Set<number>;
  nearMe: boolean;
  openNow: boolean;

  // Search
  searchQuery: string;
  searchFilterIds: Set<string> | null;

  // Directions
  activeRoute: ActiveRoute;
  userLocation: [number, number] | null;

  // Actions
  setRestaurants: (restaurants: MapRestaurant[]) => void;
  setStatuses: (
    statuses: { restaurantId: string; status: RestaurantStatus }[],
  ) => void;
  select: (id: string | null) => void;
  toggleCuisine: (c: string) => void;
  togglePrice: (p: number) => void;
  setNearMe: (v: boolean) => void;
  setOpenNow: (v: boolean) => void;
  clearFilters: () => void;
  updateStatus: (id: string, status: RestaurantStatus) => void;
  clearStatus: (id: string) => void;
  setSearchFilter: (query: string, ids: string[]) => void;
  clearSearchFilter: () => void;
  setRoute: (route: ActiveRoute) => void;
  clearRoute: () => void;
  setUserLocation: (coords: [number, number]) => void;

  // Map style
  mapStyleId: string | null;
  setMapStyleId: (id: string | null) => void;
};

export const RESTAURANTS_TTL = 30 * 60 * 1000;

export const useMapStore = create<MapState>((set) => ({
  restaurants: [],
  lastFetched: null,
  statusMap: new Map(),
  selectedId: null,
  cuisines: new Set(),
  prices: new Set(),
  nearMe: false,
  openNow: false,
  searchQuery: "",
  searchFilterIds: null,
  activeRoute: null,
  userLocation: null,

  setRestaurants: (restaurants) =>
    set({ restaurants, lastFetched: Date.now() }),

  setStatuses: (statuses) =>
    set({ statusMap: new Map(statuses.map((s) => [s.restaurantId, s.status])) }),

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

  setNearMe: (v) => set({ nearMe: v }),
  setOpenNow: (v) => set({ openNow: v }),

  clearFilters: () => set({ cuisines: new Set(), prices: new Set(), nearMe: false, openNow: false }),

  updateStatus: (id, status) =>
    set((s) => {
      const next = new Map(s.statusMap);
      next.set(id, status);
      return { statusMap: next };
    }),

  clearStatus: (id) =>
    set((s) => {
      const next = new Map(s.statusMap);
      next.delete(id);
      return { statusMap: next };
    }),

  setSearchFilter: (query, ids) =>
    set({ searchQuery: query, searchFilterIds: new Set(ids) }),

  clearSearchFilter: () => set({ searchQuery: "", searchFilterIds: null }),

  setRoute: (route) => set({ activeRoute: route }),
  clearRoute: () => set({ activeRoute: null, userLocation: null }),
  setUserLocation: (coords) => set({ userLocation: coords }),

  mapStyleId: null,
  setMapStyleId: (id) => set({ mapStyleId: id }),
}));

export function filterRestaurants(s: MapState): MapRestaurant[] {
  return s.restaurants.filter((r) => {
    const cuisineOk =
      s.cuisines.size === 0 ||
      r.cuisine_type.some((c) => s.cuisines.has(c));
    const priceOk =
      s.prices.size === 0 ||
      (r.price_range !== null && s.prices.has(r.price_range));
    const nearMeOk =
      !s.nearMe ||
      s.userLocation === null ||
      haversineDistance(s.userLocation[1], s.userLocation[0], r.latitude, r.longitude) <= 1000;
    const openNowOk = !s.openNow || isOpenNow(r.opening_hours);
    return cuisineOk && priceOk && nearMeOk && openNowOk;
  });
}
