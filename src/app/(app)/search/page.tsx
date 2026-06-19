"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useMapStore } from "@/store/mapStore";
import { SearchResultRow } from "@/components/search/SearchResultRow";
import { SearchSkeleton } from "@/components/search/SearchSkeleton";
import { haversineDistance } from "@/lib/geo";
import type { SearchResponse, SearchResult } from "@/lib/search";

function SectionHeader({ title }: { title: string }) {
  return (
    <p className="text-muted-foreground border-b px-4 pb-1.5 pt-3 text-xs font-semibold uppercase tracking-wide">
      {title}
    </p>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const select = useMapStore((s) => s.select);
  const setSearchFilter = useMapStore((s) => s.setSearchFilter);
  const userLocation = useMapStore((s) => s.userLocation);
  const setUserLocation = useMapStore((s) => s.setUserLocation);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Request location once on mount so distances show in results.
  useEffect(() => {
    if (userLocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.longitude, pos.coords.latitude]),
      () => {},
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      setError(false);
      return;
    }

    setLoading(true);
    setError(false);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error("Search failed");
        const data: SearchResponse = await res.json();
        setResults(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  function distanceFor(r: SearchResult): number | undefined {
    if (!userLocation) return undefined;
    return haversineDistance(userLocation[1], userLocation[0], r.latitude, r.longitude);
  }

  function handleSelect(restaurant: SearchResult) {
    select(restaurant.id);
    setSearchFilter(query, [restaurant.id]);
    router.push("/");
  }

  function handleShowAll(allResults: SearchResult[]) {
    setSearchFilter(query, allResults.map((r) => r.id));
    router.push("/");
  }

  const allResults = results
    ? [
        ...results.restaurants,
        ...results.dishMatches,
        ...results.cuisineMatches,
        ...results.districtMatches,
      ]
    : [];

  const totalCount = allResults.length;
  const hasResults = totalCount > 0;

  return (
    <div className="flex h-full flex-col">
      {/* Search input */}
      <div className="border-b px-4 py-3">
        <div className="relative flex items-center">
          <Search className="text-muted-foreground absolute left-3 size-4" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Restaurants, food, area…"
            className="bg-muted w-full rounded-lg py-2 pl-9 pr-9 text-sm outline-none placeholder:text-muted-foreground"
          />
          {query.length > 0 && (
            <button
              onClick={() => setQuery("")}
              className="text-muted-foreground absolute right-3"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Results area */}
      <div className="flex-1 overflow-y-auto pb-20 md:pb-4">
        {loading && <SearchSkeleton />}

        {error && !loading && (
          <p className="text-muted-foreground px-4 py-8 text-center text-sm">
            Search unavailable — try again
          </p>
        )}

        {!loading && !error && query.length < 2 && (
          <div className="text-muted-foreground px-4 py-12 text-center text-sm">
            <p className="font-medium">Find a restaurant</p>
            <p className="mt-1">Search by name, food type, or neighbourhood</p>
          </div>
        )}

        {!loading && !error && query.length >= 2 && results && !hasResults && (
          <p className="text-muted-foreground px-4 py-8 text-center text-sm">
            No results for &ldquo;{query}&rdquo;
          </p>
        )}

        {!loading && !error && hasResults && (
          <>
            {results!.restaurants.length > 0 && (
              <section>
                <SectionHeader title="Restaurants" />
                {results!.restaurants.map((r) => (
                  <SearchResultRow
                    key={r.id}
                    restaurant={r}
                    distanceMetres={distanceFor(r)}
                    onSelect={() => handleSelect(r)}
                  />
                ))}
              </section>
            )}

            {results!.dishMatches.length > 0 && (
              <section>
                <SectionHeader title="Dishes" />
                {results!.dishMatches.map((r) => (
                  <SearchResultRow
                    key={r.id}
                    restaurant={r}
                    subtitle={r.matchedDish ? `Dish: ${r.matchedDish}` : undefined}
                    distanceMetres={distanceFor(r)}
                    onSelect={() => handleSelect(r)}
                  />
                ))}
              </section>
            )}

            {results!.cuisineMatches.length > 0 && (
              <section>
                <SectionHeader title="Cuisines & food" />
                {results!.cuisineMatches.map((r) => (
                  <SearchResultRow
                    key={r.id}
                    restaurant={r}
                    subtitle={r.matchedCuisine}
                    distanceMetres={distanceFor(r)}
                    onSelect={() => handleSelect(r)}
                  />
                ))}
              </section>
            )}

            {results!.districtMatches.length > 0 && (
              <section>
                <SectionHeader title="Areas" />
                {results!.districtMatches.map((r) => (
                  <SearchResultRow
                    key={r.id}
                    restaurant={r}
                    distanceMetres={distanceFor(r)}
                    onSelect={() => handleSelect(r)}
                  />
                ))}
              </section>
            )}

            {totalCount >= 2 && (
              <div className="px-4 py-4">
                <button
                  onClick={() => handleShowAll(allResults)}
                  className="border-primary text-primary hover:bg-primary/5 w-full rounded-lg border py-2.5 text-sm font-medium transition-colors"
                >
                  Show all {totalCount} results on map
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
