"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Clock } from "lucide-react";
import Link from "next/link";
import { useMapStore } from "@/store/mapStore";
import { SearchResultRow } from "@/components/search/SearchResultRow";
import { SearchSkeleton } from "@/components/search/SearchSkeleton";
import { haversineDistance } from "@/lib/geo";
import type { SearchResponse, SearchResult } from "@/lib/search";
import type { PeopleResult } from "@/app/api/users/search/route";
import { SuggestSheet } from "@/components/search/SuggestSheet";
import { cn } from "@/lib/utils";

function highlight(text: string, query: string): React.ReactNode {
  if (!query || query.length < 2) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-[#D44C2A]/20 text-inherit">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

const AVATAR_COLORS = ["#D44C2A", "#3A7A5C", "#2C5A8A", "#8A4A2C"];
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

// Section header — lighter than before, less uppercase noise
function SectionHeader({ title }: { title: string }) {
  return (
    <p className="border-b border-[#EDE6D8] px-4 pb-1.5 pt-3 text-[11px] font-semibold tracking-[0.04em] text-[#8C7E72]">
      {title}
    </p>
  );
}

const RECENT_KEY = "foodraccoon:recent-searches";
const RECENT_MAX = 8;

function loadRecent(): string[] {
  try {
    const raw    = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((q): q is string => typeof q === "string") : [];
  } catch {
    return [];
  }
}

export default function SearchPage() {
  const router          = useRouter();
  const select          = useMapStore((s) => s.select);
  const setSearchFilter = useMapStore((s) => s.setSearchFilter);
  const userLocation    = useMapStore((s) => s.userLocation);
  const setUserLocation = useMapStore((s) => s.setUserLocation);

  const [query,         setQuery]         = useState("");
  const [results,       setResults]       = useState<SearchResponse | null>(null);
  const [people,        setPeople]        = useState<PeopleResult[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(false);
  const [recent,        setRecent]        = useState<string[]>([]);
  const [focused,       setFocused]       = useState(false);
  const [focusedIndex,  setFocusedIndex]  = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    setRecent(loadRecent());
  }, []);

  function saveRecent(q: string) {
    const trimmed = q.trim();
    if (trimmed.length < 2) return;
    setRecent((prev) => {
      const next = [trimmed, ...prev.filter((r) => r.toLowerCase() !== trimmed.toLowerCase())].slice(0, RECENT_MAX);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function removeRecent(q: string) {
    setRecent((prev) => {
      const next = prev.filter((r) => r !== q);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function clearRecent() {
    setRecent([]);
    try { localStorage.removeItem(RECENT_KEY); } catch {}
  }

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
      setPeople([]);
      setError(false);
      return;
    }
    setLoading(true);
    setError(false);

    const timer = setTimeout(async () => {
      try {
        const [restaurantRes, peopleRes] = await Promise.all([
          fetch(`/api/search?q=${encodeURIComponent(query)}`),
          fetch(`/api/users/search?q=${encodeURIComponent(query)}`),
        ]);
        if (!restaurantRes.ok) throw new Error("Search failed");
        const data: SearchResponse = await restaurantRes.json();
        setResults(data);
        if (peopleRes.ok) setPeople(await peopleRes.json());
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
    saveRecent(query);
    select(restaurant.id);
    setSearchFilter(query, [restaurant.id]);
    router.push("/");
  }

  function handleShowAll(allResults: SearchResult[]) {
    saveRecent(query);
    setSearchFilter(query, allResults.map((r) => r.id));
    router.push("/");
  }

  const allResults = results
    ? [...results.restaurants, ...results.dishMatches, ...results.cuisineMatches, ...results.districtMatches]
    : [];
  const totalCount = allResults.length;
  const hasResults = totalCount > 0;

  // Flat list of navigable items for keyboard navigation
  type NavItem = { type: "restaurant"; data: SearchResult } | { type: "person"; data: PeopleResult };
  const navItems: NavItem[] = [
    ...allResults.map((r): NavItem => ({ type: "restaurant", data: r })),
    ...people.map((p): NavItem => ({ type: "person", data: p })),
  ];

  // Reset keyboard focus when results change
  useEffect(() => { setFocusedIndex(-1); }, [query]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => Math.min(prev + 1, navItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && focusedIndex >= 0) {
      e.preventDefault();
      const item = navItems[focusedIndex];
      if (item.type === "restaurant") handleSelect(item.data);
      else router.push(`/u/${item.data.username}`);
    } else if (e.key === "Escape") {
      setQuery("");
      setPeople([]);
      setResults(null);
      inputRef.current?.blur();
    }
  }

  return (
    <div className="flex h-full flex-col bg-[#F5F0E8]">

      {/* ── Search input ── */}
      <div className="border-b border-[#EDE6D8] bg-[#F5F0E8] px-4 py-3">
        <div className="relative flex items-center">
          <Search
            className={cn(
              "absolute left-3.5 size-4 transition-colors",
              focused ? "text-[#D44C2A]" : "text-[#8C7E72]",
            )}
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="Restaurants, food, area…"
            aria-autocomplete="list"
            aria-activedescendant={focusedIndex >= 0 ? `search-item-${focusedIndex}` : undefined}
            className={cn(
              "w-full rounded-[14px] py-2.5 pl-10 pr-10 text-sm text-[#2C2420] outline-none",
              "border-2 bg-white transition-all placeholder:text-[#8C7E72]",
              focused
                ? "border-[#D44C2A] shadow-[0_0_0_4px_rgba(212,76,42,0.10)]"
                : "border-transparent bg-[#EDE6D8]",
            )}
          />
          {query.length > 0 && (
            <button
              onClick={() => { setQuery(""); setPeople([]); setResults(null); inputRef.current?.focus(); }}
              className="absolute right-3.5 text-[#8C7E72] transition-colors hover:text-[#2C2420]"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Result count chip ── */}
      {!loading && hasResults && (
        <div className="border-b border-[#EDE6D8] px-4 py-1.5">
          <span className="text-xs text-[#8C7E72]">
            {totalCount} restaurant{totalCount !== 1 ? "s" : ""}
            {people.length > 0 && ` · ${people.length} ${people.length === 1 ? "person" : "people"}`}
          </span>
        </div>
      )}

      {/* ── Results area ── */}
      <div className="flex-1 overflow-y-auto pb-20 md:pb-4">
        {loading && <SearchSkeleton />}

        {error && !loading && (
          <p className="px-4 py-8 text-center text-sm text-[#8C7E72]">
            Search unavailable — try again
          </p>
        )}

        {/* Recent searches */}
        {!loading && !error && query.length < 2 && recent.length > 0 && (
          <section>
            <div className="flex items-center justify-between border-b border-[#EDE6D8] px-4 pb-1.5 pt-3">
              <p className="text-[11px] font-semibold tracking-[0.04em] text-[#8C7E72]">
                Recent searches
              </p>
              <button
                onClick={clearRecent}
                className="text-xs font-medium text-[#8C7E72] hover:text-[#D44C2A] transition-colors"
              >
                Clear all
              </button>
            </div>
            {recent.map((q) => (
              <div
                key={q}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[#EDE6D8]"
              >
                <button
                  onClick={() => { setQuery(q); inputRef.current?.focus(); }}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <Clock className="size-4 shrink-0 text-[#8C7E72]" />
                  <span className="truncate text-sm text-[#2C2420]">{q}</span>
                </button>
                <button
                  onClick={() => removeRecent(q)}
                  className="shrink-0 text-[#8C7E72] hover:text-[#2C2420] transition-colors"
                  aria-label={`Remove ${q}`}
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </section>
        )}

        {/* Empty state */}
        {!loading && !error && query.length < 2 && recent.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="font-semibold text-[#2C2420]">Find a restaurant</p>
            <p className="mt-1 text-sm text-[#8C7E72]">
              Search by name, food type, or neighbourhood
            </p>
          </div>
        )}

        {/* No results */}
        {!loading && !error && query.length >= 2 && results && !hasResults && (
          <div className="px-4 py-8 text-center">
            <p className="mb-4 text-sm text-[#8C7E72]">
              No results for &ldquo;{query}&rdquo;
            </p>
            <p className="mb-3 text-sm text-[#8C7E72]">Can&apos;t find what you&apos;re looking for?</p>
            <SuggestSheet initialName={query} triggerLabel="+ Suggest a restaurant" />
          </div>
        )}

        {/* People */}
        {!loading && !error && people.length > 0 && (
          <section>
            <SectionHeader title="People" />
            {people.map((p, i) => {
              const name = p.display_name ?? p.username;
              const initials = name.slice(0, 2).toUpperCase();
              const color = avatarColor(name);
              const navIdx = allResults.length + i;
              const isItemFocused = focusedIndex === navIdx;
              return (
                <Link
                  key={p.username}
                  id={`search-item-${navIdx}`}
                  href={`/u/${p.username}`}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[#EDE6D8]",
                    isItemFocused && "bg-[#EDE6D8]",
                  )}
                >
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt={name} width={32} height={32} className="size-8 rounded-full object-cover shrink-0" />
                  ) : (
                    <div
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: color }}
                    >
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#2C2420]">{highlight(name, query)}</p>
                    <p className="text-xs text-[#8C7E72]">
                      @{p.username} · {p.followers_count} followers
                    </p>
                  </div>
                </Link>
              );
            })}
          </section>
        )}

        {/* Results */}
        {!loading && !error && hasResults && (
          <>
            {results!.restaurants.length > 0 && (
              <section>
                <SectionHeader title="Restaurants" />
                {results!.restaurants.map((r, i) => (
                  <SearchResultRow
                    key={r.id}
                    restaurant={r}
                    distanceMetres={distanceFor(r)}
                    onSelect={() => handleSelect(r)}
                    nameNode={highlight(r.name, query)}
                    isFocused={focusedIndex === i}
                  />
                ))}
              </section>
            )}

            {results!.dishMatches.length > 0 && (() => {
              const offset = results!.restaurants.length;
              return (
                <section>
                  <SectionHeader title="Dishes" />
                  {results!.dishMatches.map((r, i) => (
                    <SearchResultRow
                      key={r.id}
                      restaurant={r}
                      subtitle={r.matchedDish ? `Dish: ${r.matchedDish}` : undefined}
                      distanceMetres={distanceFor(r)}
                      onSelect={() => handleSelect(r)}
                      nameNode={highlight(r.name, query)}
                      isFocused={focusedIndex === offset + i}
                    />
                  ))}
                </section>
              );
            })()}

            {results!.cuisineMatches.length > 0 && (() => {
              const offset = results!.restaurants.length + results!.dishMatches.length;
              return (
                <section>
                  <SectionHeader title="Cuisines & food" />
                  {results!.cuisineMatches.map((r, i) => (
                    <SearchResultRow
                      key={r.id}
                      restaurant={r}
                      subtitle={r.matchedCuisine}
                      distanceMetres={distanceFor(r)}
                      onSelect={() => handleSelect(r)}
                      nameNode={highlight(r.name, query)}
                      isFocused={focusedIndex === offset + i}
                    />
                  ))}
                </section>
              );
            })()}

            {results!.districtMatches.length > 0 && (() => {
              const offset = results!.restaurants.length + results!.dishMatches.length + results!.cuisineMatches.length;
              return (
                <section>
                  <SectionHeader title="Areas" />
                  {results!.districtMatches.map((r, i) => (
                    <SearchResultRow
                      key={r.id}
                      restaurant={r}
                      distanceMetres={distanceFor(r)}
                      onSelect={() => handleSelect(r)}
                      nameNode={highlight(r.name, query)}
                      isFocused={focusedIndex === offset + i}
                    />
                  ))}
                </section>
              );
            })()}

            {totalCount >= 2 && (
              <div className="px-4 py-4">
                <button
                  onClick={() => handleShowAll(allResults)}
                  className="w-full rounded-xl border border-[#D44C2A] py-2.5 text-sm font-semibold text-[#D44C2A] transition-colors hover:bg-[#D44C2A] hover:text-white"
                >
                  Show all {totalCount} results on map
                </button>
              </div>
            )}

            <div className="border-t border-[#EDE6D8] px-4 py-5 text-center">
              <p className="mb-2 text-sm text-[#8C7E72]">Missing a restaurant?</p>
              <SuggestSheet triggerLabel="+ Suggest it" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
