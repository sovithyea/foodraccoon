"use client";

import { useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  useMapStore,
  filterRestaurants,
  type MapState,
} from "@/store/mapStore";
import { DEFAULT_ZOOM, PHNOM_PENH_CENTER } from "@/lib/restaurants";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const SOURCE_ID = "restaurants";

type FeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Point>;

function toGeoJSON(
  restaurants: MapState["restaurants"],
  savedIds: Set<string>,
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
        saved: savedIds.has(r.id),
      },
    })),
  };
}

export function RestaurantMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const loadedRef = useRef(false);

  const select = useMapStore((s) => s.select);

  // Reactive filtered set + saved ids.
  const restaurants = useMapStore((s) => s.restaurants);
  const cuisines = useMapStore((s) => s.cuisines);
  const prices = useMapStore((s) => s.prices);
  const savedIds = useMapStore((s) => s.savedIds);

  const geojson = useMemo<FeatureCollection>(() => {
    const filtered = filterRestaurants({
      restaurants,
      cuisines,
      prices,
    } as MapState);
    return toGeoJSON(filtered, savedIds);
  }, [restaurants, cuisines, prices, savedIds]);

  // Initialise the map once.
  useEffect(() => {
    if (!TOKEN || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: PHNOM_PENH_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");

    map.on("load", () => {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 48,
      });

      // Cluster bubbles
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#D44C2A",
          "circle-opacity": 0.9,
          "circle-radius": [
            "step",
            ["get", "point_count"],
            16,
            5,
            22,
            15,
            28,
          ],
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
        paint: { "text-color": "#fff" },
      });

      // Individual restaurants — saved ones glow saffron, others terracotta.
      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "case",
            ["get", "saved"],
            "#E8834A",
            "#D44C2A",
          ],
          "circle-radius": ["case", ["get", "saved"], 9, 7],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#F5F0E8",
        },
      });

      loadedRef.current = true;

      // Interactions
      map.on("click", "clusters", (e) => {
        const feature = map.queryRenderedFeatures(e.point, {
          layers: ["clusters"],
        })[0];
        const clusterId = feature.properties?.cluster_id;
        const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || zoom == null) return;
          map.easeTo({
            center: (feature.geometry as GeoJSON.Point).coordinates as [
              number,
              number,
            ],
            zoom,
          });
        });
      });

      map.on("click", "unclustered-point", (e) => {
        const id = e.features?.[0]?.properties?.id as string | undefined;
        if (id) select(id);
      });

      for (const layer of ["clusters", "unclustered-point"]) {
        map.on("mouseenter", layer, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layer, () => {
          map.getCanvas().style.cursor = "";
        });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push filtered/saved data to the source when it changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    source?.setData(geojson);
  }, [geojson]);

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

  return <div ref={containerRef} className="h-full w-full" />;
}
