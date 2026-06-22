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
| `(app)` | `/restaurant/[id]` | Server-rendered restaurant detail page |
| `(app)` | `/u/[username]` | Public profile page |
| `(public)` | `/u/[username]/[slug]` | Public shared list page (no shell) |
| `(public)` | `/privacy`, `/terms` | Static legal pages |
| — | `/login`, `/signup`, `/verify-email` | Auth pages |
| — | `/admin`, `/admin/restaurants`, `/admin/suggestions` | Admin panel — requires `profiles.is_admin = true` |

### Auth

Auth is **optional**. `proxy.ts` (the middleware — not `middleware.ts`) refreshes cookies on every request but does not enforce login. Unauthenticated actions (rating, add to list, follow) show `AuthModal` (`src/components/auth/AuthModal.tsx`) via `useAuthModal` (Zustand, `src/hooks/useAuthModal.ts`) instead of redirecting. API routes return 401 silently.

Use `src/lib/auth-guard.ts` helpers in route handlers:
```ts
const { user, error } = await requireUser(supabase);
if (error) return error;
```
`requireVerifiedUser` additionally checks `email_confirmed_at`.

### Supabase client usage

- **Browser components**: `src/lib/supabase/client.ts`
- **Server components / route handlers**: `src/lib/supabase/server.ts` (`await createClient()`)
- **Middleware**: `src/lib/supabase/middleware.ts`
- DB types at `src/lib/database.types.ts` — regenerate with Supabase CLI after schema changes.

RLS is fully implemented (`supabase/migrations/0002_rls_and_triggers.sql`). Trigger functions that UPDATE other users' rows (e.g., `update_follow_counts`) must be `SECURITY DEFINER` or RLS will block the cross-user update.

### Zustand stores

**`src/store/mapStore.ts`** — all map state:
- `restaurants` — full list, client-side fetched + cached for 30 min (`lastFetched` + `RESTAURANTS_TTL`). `MapView` skips fetch if cache fresh.
- `statusMap: Map<string, RestaurantStatus>` — per-restaurant user status (`want_to_try` / `visited` / `favourite`)
- `selectedId` — opens `RestaurantPanel`; triggers `flyTo`
- `cuisines` / `prices` — active filter sets; `filterRestaurants(state)` derives filtered list
- `searchFilterIds: Set<string> | null` — when set, map shows only these IDs
- `mapStyleId: string | null` — `"light"` / `"dark"` / `"streets"` / `"satellite"`; `null` follows app theme
- `userLocation` — cached after first geolocation request (reused across components)

**`src/store/listsStore.ts`** — custom lists. DB is source of truth; `/lists` re-fetches on every mount (do not gate on a cached flag).

### Map rendering — `src/components/map/`

`MapView` receives only `statuses` (server-fetched) as prop. Fetches restaurants client-side → updates store. `RestaurantMap` owns the Mapbox GL instance in a ref; reads store reactively. Style reloads re-add layers via `style.load`. GeoJSON source updated via `source.setData()` — never destroy/recreate the map instance.

Map page (`src/app/(app)/page.tsx`) is a server component that fetches **only** `user_restaurants` status (auth-dependent, small). The heavy restaurant payload (~3.9MB) is always client-side.

Marker colours: red (unsaved) · orange (want_to_try) · green (visited) · amber (favourite).

### Restaurant panel — `src/components/map/RestaurantPanel.tsx`

Bottom sheet (mobile) / right sidebar (desktop ≥768px) when `selectedId` is set. `RatingSection` (`src/components/restaurant/RatingSection.tsx`) handles status + rating — checks auth via `createClient().auth.getUser()` before acting; calls `useAuthModal.open()` if no user. "Add to list" button similarly checks auth before expanding.

### Search — `src/app/(app)/search/page.tsx`

Debounces 300ms, runs two fetches in parallel: `GET /api/search?q=` (restaurants, 4 buckets) and `GET /api/users/search?q=` (people). Restaurant results: name > dish > cuisine > district deduplication. People results shown in a "People" section. Selecting a restaurant: `setSearchFilter + select + router.push("/")` — map flies to pin, all other markers hidden.

Recent searches: `localStorage` key `foodraccoon:recent-searches`, max 8.

### Lists — `src/app/(app)/lists/`

Three fixed lists (derived from `statusMap`) + user-created custom lists (`lists` + `list_restaurants` tables). When joining `list_restaurants → restaurants`, PostgREST nests under the table name (`restaurants`); API remaps to `restaurant` (singular) for the UI.

`CreateListSheet` is shared for create and edit — pass `editList` prop to edit; fields sync to `editList` on open. On 401 from the create API, it calls `useAuthModal.open()` instead of showing an error.

### Social — `/u/[username]` + feed

`src/app/(app)/u/[username]/page.tsx` — server component public profile. `PublicProfileFollow` client island handles follow/unfollow toggle + followers/following sheets with real user lists. Follower count updates are optimistic (revert on failure); `router.refresh()` revalidates server component after API success.

`src/app/(app)/feed/page.tsx` — server component. Requires auth (shows sign-in empty state if not). Queries `user_restaurants` for following IDs, then fetches activity feed. `FeedList` client island handles "load more" via cursor pagination (`lt("updated_at", cursor)`).

### Key DB tables

`profiles` (1:1 with auth.users) · `restaurants` (service-role writes only) · `user_restaurants` (status, rating 1–10, review per user×restaurant, `is_public` flag) · `lists` + `list_restaurants` · `follows` (follower_id → profiles, following_id → profiles) · `dishes` + `dish_logs` · `recommendations`

`profiles` has `followers_count` / `following_count` maintained by the `update_follow_counts` trigger (SECURITY DEFINER — required for cross-user UPDATE past RLS).

### API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/restaurants` | GET | All restaurants, paginated past 1000-row cap |
| `/api/restaurants/[id]/rate` | POST/DELETE | Upsert / remove `user_restaurants` row |
| `/api/search` | GET | Multi-bucket restaurant search `?q=` |
| `/api/directions` | GET | Mapbox walking/driving directions |
| `/api/lists` | GET/POST | User's lists with counts / create list |
| `/api/lists/[id]` | PUT/DELETE | Update (re-slugs on title change) / delete |
| `/api/lists/[id]/restaurants` | GET/POST | List members / add restaurant |
| `/api/lists/[id]/restaurants/[rid]` | DELETE | Remove restaurant from list |
| `/api/lists/user/[username]/[slug]` | GET | Public list by owner + slug |
| `/api/users/[username]` | GET | Public profile + `is_following` for caller |
| `/api/users/[username]/follow` | POST/DELETE | Follow / unfollow (idempotent) |
| `/api/users/[username]/followers` | GET | Paginated followers list (`?offset=`) |
| `/api/users/[username]/following` | GET | Paginated following list (`?offset=`) |
| `/api/users/search` | GET | Profile search by username/display_name `?q=` |
| `/api/admin/restaurants/add` | POST | Admin-only: insert restaurant |
| `/api/admin/restaurants/[id]` | PATCH | Admin-only: update tags/cuisine/district |

### Supabase pagination

PostgREST default `max_rows = 1000`. `GET /api/restaurants` bypasses this with a `count: "exact"` HEAD query then parallel `.range()` fetches. Never use `.limit()` to fetch > 1000 rows — it silently truncates. The full payload exceeds Next.js's 2MB `unstable_cache` limit; caching is done client-side in Zustand instead.

### Next.js 16 — dynamic route params

`params` is a `Promise` in Next.js 16 App Router:
```ts
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}
```

### base-ui component gotchas

`src/components/ui/button.tsx` wraps `@base-ui/react/button` — **no `asChild` prop**. Use `buttonVariants()` on a `<Link>` directly:
```tsx
<Link href="/somewhere" className={buttonVariants({ variant: "outline" })}>Go</Link>
```

`DropdownMenu*` wraps `@base-ui/react/menu` — `DropdownMenuItem` fires **`onClick`**, not `onSelect`. `DropdownMenuTrigger` uses `render` prop, not `asChild`.

`SheetContent` renders its own close button by default (`showCloseButton={true}`). Pass `showCloseButton={false}` when providing a custom close button to avoid duplicates.

### UI conventions

- Components: `src/components/{domain}/`. Shared primitives: `src/components/ui/`.
- `cn()` helper: `src/lib/utils.ts` (clsx + tailwind-merge).
- Tailwind v4. Dark mode via `dark` class on `<html>`. Theme from `next-themes`.
- Chalk Market palette: `#F5F0E8` bg · `#EDE6D8` card · `#D44C2A` accent/primary · `#2C2420` text · `#D4C8B4` border.
- Key lib files: `src/lib/restaurants.ts` (MapRestaurant type, priceLabel), `src/lib/geo.ts` (haversine, formatDistance, walkTimeMinutes), `src/lib/staticMap.ts` (Mapbox Static Images), `src/lib/search.ts` (SearchResult/SearchResponse types), `src/lib/lists.ts` (ListWithCount/ListWithMembership types).
