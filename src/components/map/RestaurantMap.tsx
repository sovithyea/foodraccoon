"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTheme } from "next-themes";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  useMapStore,
  filterRestaurants,
  type MapState,
} from "@/store/mapStore";
import { DEFAULT_ZOOM, PHNOM_PENH_CENTER } from "@/lib/restaurants";
import { SearchFilterPill } from "./SearchFilterPill";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const SOURCE_ID = "restaurants";
const LIGHT_STYLE = "mapbox://styles/mapbox/light-v11";
const DARK_STYLE = "mapbox://styles/mapbox/dark-v11";

export const MAP_STYLES = [
  { id: "light",     label: "Light",   url: LIGHT_STYLE },
  { id: "dark",      label: "Dark",    url: DARK_STYLE },
  { id: "streets",   label: "Streets", url: "mapbox://styles/mapbox/streets-v12" },
  { id: "satellite", label: "Hybrid",  url: "mapbox://styles/mapbox/satellite-streets-v12" },
] as const;

export type MapStyleId = typeof MAP_STYLES[number]["id"];

type FeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Point>;

function toGeoJSON(
  restaurants: MapState["restaurants"],
  statusMap: Map<string, string>,
): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: restaurants.map((r) => ({
      type: "Feature",
      id: r.id,
      geometry: { type: "Point", coordinates: [r.longitude, r.latitude] },
      properties: {
        id: r.id,
        name: r.name,
        status: statusMap.get(r.id) ?? null,
      },
    })),
  };
}

export function RestaurantMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const loadedRef = useRef(false);
  const geojsonRef = useRef<FeatureCollection>({ type: "FeatureCollection", features: [] });
  const selectRef = useRef<(id: string | null) => void>(() => {});
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const restaurantsRef = useRef<MapState["restaurants"]>([]);
  const searchFilterIdsRef = useRef<Set<string> | null>(null);
  const resolvedThemeRef = useRef<string | undefined>(undefined);
  const mapStyleIdRef = useRef<string | null>(null);

  const { resolvedTheme } = useTheme();
  const select = useMapStore((s) => s.select);
  selectRef.current = select;

  const restaurants = useMapStore((s) => s.restaurants);
  const cuisines = useMapStore((s) => s.cuisines);
  const prices = useMapStore((s) => s.prices);
  const statusMap = useMapStore((s) => s.statusMap);
  const activeRoute = useMapStore((s) => s.activeRoute);
  const userLocation = useMapStore((s) => s.userLocation);
  const selectedId = useMapStore((s) => s.selectedId);
  const searchFilterIds = useMapStore((s) => s.searchFilterIds);
  const mapStyleId = useMapStore((s) => s.mapStyleId);
  const nearMe = useMapStore((s) => s.nearMe);
  const openNow = useMapStore((s) => s.openNow);

  const geojson = useMemo<FeatureCollection>(() => {
    let filtered = filterRestaurants({
      restaurants,
      cuisines,
      prices,
      nearMe,
      openNow,
      userLocation,
    } as MapState);
    if (searchFilterIds) {
      filtered = filtered.filter((r) => searchFilterIds.has(r.id));
    }
    return toGeoJSON(filtered, statusMap);
  }, [restaurants, cuisines, prices, nearMe, openNow, userLocation, statusMap, searchFilterIds]);

  geojsonRef.current = geojson;
  selectedIdRef.current = selectedId;
  restaurantsRef.current = restaurants;
  searchFilterIdsRef.current = searchFilterIds;
  resolvedThemeRef.current = resolvedTheme;
  mapStyleIdRef.current = mapStyleId;

  // Initialise the map once.
  useEffect(() => {
    if (!TOKEN || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = TOKEN;

    const isDark = document.documentElement.classList.contains("dark");
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: isDark ? DARK_STYLE : LIGHT_STYLE,
      center: PHNOM_PENH_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");

    function setupRestaurantLayers() {
      const sid = mapStyleIdRef.current;
      const dark = sid === "dark" || (!sid && document.documentElement.classList.contains("dark"));
      const strokeColor = (sid === "satellite" || sid === "streets") ? "#ffffff"
        : dark ? "#1C1712" : "#F5F0E8";
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: geojsonRef.current,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 48,
      });
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#D44C2A",
          "circle-opacity": 0.9,
          "circle-radius": ["step", ["get", "point_count"], 16, 5, 22, 15, 28],
          "circle-stroke-width": 2,
          "circle-stroke-color": "rgba(255,255,255,0.6)",
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 13,
        },
        paint: { "text-color": "#F5F0E8" },
      });
      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "case",
            ["==", ["get", "status"], "favourite"], "#C9973A",
            ["==", ["get", "status"], "visited"], "#4A7C59",
            ["==", ["get", "status"], "want_to_try"], "#E8834A",
            "#D44C2A",
          ],
          "circle-radius": ["case", ["!=", ["get", "status"], null], 9, 7],
          "circle-stroke-width": 2,
          "circle-stroke-color": strokeColor,
        },
      });
      loadedRef.current = true;
    }

    map.on("load", () => {
      map.on("click", "clusters", (e) => {
        const feature = map.queryRenderedFeatures(e.point, { layers: ["clusters"] })[0];
        const clusterId = feature.properties?.cluster_id;
        const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || zoom == null) return;
          map.easeTo({
            center: (feature.geometry as GeoJSON.Point).coordinates as [number, number],
            zoom,
          });
        });
      });

      map.on("click", "unclustered-point", (e) => {
        const id = e.features?.[0]?.properties?.id as string | undefined;
        if (id) selectRef.current(id);
      });

      for (const layer of ["clusters", "unclustered-point"]) {
        map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
      }
    });

    map.on("style.load", setupRestaurantLayers);

    return () => {
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch to a manually selected map style.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current || !mapStyleId) return;
    const style = MAP_STYLES.find((s) => s.id === mapStyleId);
    if (!style) return;
    loadedRef.current = false;
    map.setStyle(style.url);
  }, [mapStyleId]);

  // Switch Mapbox style when theme changes (skipped when user picked a style manually).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current || mapStyleId) return;
    loadedRef.current = false;
    map.setStyle(resolvedTheme === "dark" ? DARK_STYLE : LIGHT_STYLE);
  }, [resolvedTheme, mapStyleId]);

  // Push filtered data to the source when it changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    source?.setData(geojson);
  }, [geojson]);

  // Fly to a restaurant when it's selected (e.g. from search).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current || !selectedId) return;
    const r = restaurants.find((r) => r.id === selectedId);
    if (r) {
      map.flyTo({ center: [r.longitude, r.latitude], zoom: 15, duration: 600 });
    }
  }, [selectedId, restaurants]);

  // Fit map bounds when a search filter is applied.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current || !searchFilterIds || searchFilterIds.size === 0) return;
    const coords = restaurants
      .filter((r) => searchFilterIds.has(r.id))
      .map((r) => [r.longitude, r.latitude] as [number, number]);
    if (coords.length === 0) return;
    const bounds = coords.reduce(
      (b, c) => b.extend(c),
      new mapboxgl.LngLatBounds(coords[0], coords[0]),
    );
    map.fitBounds(bounds, { padding: 80, maxZoom: 16 });
  }, [searchFilterIds, restaurants]);

  // Draw / clear the active directions route.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;

    const ROUTE_SOURCE = "route";
    const ROUTE_LAYER = "route-line";

    const clearRoute = () => {
      if (map.getLayer(ROUTE_LAYER)) map.removeLayer(ROUTE_LAYER);
      if (map.getSource(ROUTE_SOURCE)) map.removeSource(ROUTE_SOURCE);
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
    };

    clearRoute();

    if (!activeRoute) return;

    map.addSource(ROUTE_SOURCE, {
      type: "geojson",
      data: { type: "Feature", geometry: activeRoute.geometry, properties: {} },
    });
    map.addLayer({
      id: ROUTE_LAYER,
      type: "line",
      source: ROUTE_SOURCE,
      paint: {
        "line-color": "#D44C2A",
        "line-width": 4,
        "line-opacity": 0.85,
      },
    });

    const coords = activeRoute.geometry.coordinates as [number, number][];
    const bounds = coords.reduce(
      (b, c) => b.extend(c),
      new mapboxgl.LngLatBounds(coords[0], coords[0]),
    );
    map.fitBounds(bounds, { padding: 60 });

    if (userLocation) {
      const el = document.createElement("div");
      el.className = "user-location-dot";
      userMarkerRef.current = new mapboxgl.Marker(el)
        .setLngLat(userLocation)
        .addTo(map);
    }
  }, [activeRoute, userLocation]);

  if (!TOKEN) {
    return (
      <div className="bg-muted text-muted-foreground flex h-full w-full items-center justify-center p-8 text-center text-sm">
        <div className="max-w-md space-y-2">
          <p className="text-foreground font-medium">Map token missing</p>
          <p>
            Add <code className="text-primary">NEXT_PUBLIC_MAPBOX_TOKEN</code> to
            your <code>.env.local</code> (free at account.mapbox.com) and restart
            the dev server.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div ref={containerRef} className="h-full w-full" />
      <SearchFilterPill />
    </>
  );
}
