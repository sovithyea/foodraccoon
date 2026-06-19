# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev               # start dev server (localhost:3000 or next available port)
npm run build             # production build + type check
npm run lint              # eslint
npx tsx scripts/seed.ts           # seed from local JSON (needs service-role key)
npx tsx scripts/import-places.ts  # import from Google Places API (needs GOOGLE_PLACES_API_KEY)
```

## Environment variables

`.env.local` needs:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_MAPBOX_TOKEN`
- `SUPABASE_SERVICE_ROLE_KEY` (scripts only — bypasses RLS)
- `GOOGLE_PLACES_API_KEY` (import-places.ts only)

## Architecture

**Foodracoon** — Phnom Penh restaurant discovery app (Beli-style). Next.js 16 App Router + Supabase (project `gnmzwzmtdblkujyuvadi`) + Mapbox GL.

### Route groups

| Group | Path | Purpose |
|-------|------|---------|
| `(app)` | `/`, `/search`, `/lists`, `/feed`, `/profile` | App shell with Nav sidebar |
| — | `/login` | Email/password sign-in (no auth wall — app works without login) |

Routes `/lists`, `/feed`, `/search` are implemented stubs (no auth required, data is public). `/profile` redirects to `/login` if unauthenticated.

### Auth

Auth is **optional**. `proxy.ts` (the middleware — not `middleware.ts`) calls `updateSession` on every request to refresh cookies, but does not enforce login. Status saves and ratings use optimistic updates client-side and persist to DB only when a user is signed in. The API routes (`/api/restaurants/[id]/rate`) return 401 silently — the UI never surfaces this to the user.

### Supabase client usage

- **Browser components**: `src/lib/supabase/client.ts`
- **Server components / route handlers**: `src/lib/supabase/server.ts` (`await createClient()`)
- **Middleware**: `src/lib/supabase/middleware.ts`
- DB types at `src/lib/database.types.ts` — regenerate with Supabase CLI after schema changes.

### Zustand store — `src/store/mapStore.ts`

Single store for all map state. Key fields:

- `restaurants` — full list, loaded once on home page mount via `MapView`
- `statusMap: Map<string, RestaurantStatus>` — per-restaurant user status (`want_to_try` / `visited` / `favourite`). Replaces the old `savedIds` set.
- `selectedId` — opens `RestaurantPanel` when set; triggers `flyTo` in `RestaurantMap`
- `cuisines` / `prices` — active filter sets; `filterRestaurants(state)` derives the filtered list
- `searchFilterIds: Set<string> | null` — when set, map shows only these restaurant IDs; `SearchFilterPill` shows a clear button
- `searchQuery` — stored alongside `searchFilterIds` for the pill label
- `activeRoute` / `userLocation` — directions state

`userLocation` is cached in the store so geolocation is only requested once (reused by both `RestaurantPanel` distance row and `/search` page result rows).

### Map rendering — `src/components/map/`

`MapView` initialises the store then renders `RestaurantMap` + `FilterBar` + `RestaurantPanel` + `DirectionsPanel` + `SearchFilterPill` as absolute overlays on top of the Mapbox canvas.

`RestaurantMap` owns the Mapbox GL instance in a ref. Style reloads (dark/light theme switch) re-add all layers via `style.load`. GeoJSON source is updated via `source.setData()` on every filter/status/search change — never destroy/recreate the map.

Marker colours: red (unsaved) · orange (want_to_try) · green (visited) · amber (favourite).

### Restaurant panel — `src/components/map/RestaurantPanel.tsx`

Opens as a bottom sheet (`Sheet` from shadcn) when `selectedId` is set. Contains:
1. Google Places cover photo (`cover_photo_url`) if present
2. Mapbox Static Images thumbnail (light or dark, matching theme) — `src/lib/staticMap.ts`
3. Distance + walk time row — computed via `haversineDistance()` from `src/lib/geo.ts`, geolocation requested non-blocking on panel open
4. Status toggle (Want to Try / Visited / Favourite) with toggle-off — `RatingSection` subcomponent
5. 1–10 rating + review textarea (shown when status is visited or favourite)
6. Disabled Recommend / View Full placeholders
7. Get directions button — calls Mapbox Directions API via `/api/directions`, draws route on map

### Search — `src/app/(app)/search/page.tsx` + `src/app/api/search/route.ts`

Search page debounces 300ms then calls `GET /api/search?q=`. The API runs four parallel Supabase queries: name ilike, district ilike, all-restaurants filtered in JS for cuisine/tag arrays, and dish name ilike (two-step: dishes → restaurants). Results are deduplicated (name > dish > cuisine > district priority) and returned as four bucketed arrays.

Tapping a result calls `setSearchFilter(query, [id])` + `select(id)` + `router.push("/")` — map flies to the pin, panel opens, all other markers hidden.

### Key DB tables

`profiles` (1:1 with auth.users) · `restaurants` (service-role writes only — via seed/import scripts) · `user_restaurants` (status, rating 1–10, review per user×restaurant) · `lists` + `list_restaurants` · `recommendations` · `follows` · `dishes` + `dish_logs`

### API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/restaurants/[id]/rate` | POST | Upsert `user_restaurants` row — accepts `{ status, rating?, review? }` |
| `/api/restaurants/[id]/rate` | DELETE | Remove user's relationship with a restaurant |
| `/api/search` | GET | Multi-bucket restaurant search, `?q=` param |
| `/api/directions` | GET | Mapbox walking/driving directions, `?from=lng,lat&to=lng,lat&profile=` |

### UI conventions

- Components live in `src/components/{domain}/`. Shared primitives from shadcn in `src/components/ui/`.
- `src/lib/utils.ts` — `cn()` helper (clsx + tailwind-merge).
- `src/lib/restaurants.ts` — `MapRestaurant` type, `priceLabel()`, map center/zoom constants.
- `src/lib/geo.ts` — `haversineDistance()`, `formatDistance()`, `walkTimeMinutes()`.
- `src/lib/staticMap.ts` — Mapbox Static Images URL builder.
- `src/lib/search.ts` — `SearchResult` and `SearchResponse` types shared between API and UI.
- Tailwind v4. Dark mode via `dark` class on `<html>`. Theme provided by `next-themes` with `suppressHydrationWarning` on `<html>` and `<body>`.
- Chalk Market palette: `#F5F0E8` bg · `#EDE6D8` card · `#D44C2A` accent/primary · `#2C2420` text · `#D4C8B4` border.
