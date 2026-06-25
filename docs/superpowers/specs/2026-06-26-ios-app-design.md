# FoodRaccoon iOS App — Design Spec
**Date:** 2026-06-26  
**Status:** Approved  
**Scope:** Full feature-parity native iOS app for FoodRaccoon (Phnom Penh restaurant discovery)

---

## Overview

Native SwiftUI iOS app hitting the same Supabase backend (`gnmzwzmtdblkujyuvadi`) as the web app. No Next.js API routes — Swift code calls Supabase directly. RLS enforced at DB level, identical to web.

**Target:** iOS 17+, separate repo `foodracoon-ios`  
**Auth:** Email/password + Sign in with Apple  
**State:** `@Observable` classes (iOS 17 macro)

---

## Architecture

### Dependencies (Swift Package Manager)
- `supabase/supabase-swift` — auth, DB, realtime
- `mapbox/mapbox-maps-ios` — map rendering
- `AuthenticationServices` (Apple built-in) — Sign in with Apple

### Project Structure
```
FoodRaccoon/
├── App/
│   ├── FoodRaccoonApp.swift      # @main, env object injection
│   ├── RootView.swift            # Auth gate: splash → onboarding or TabBar
│   └── SplashView.swift          # Checks session, routes to auth or tab bar
├── Auth/
│   ├── AuthStore.swift           # @Observable, session, profile
│   ├── LoginView.swift
│   ├── SignupView.swift
│   ├── VerifyEmailView.swift
│   └── OnboardingView.swift      # First-launch flow
├── Map/
│   ├── MapView.swift             # Mapbox map + GeoJSON markers
│   ├── RestaurantPanel.swift     # Bottom sheet, .presentationDetents
│   ├── FilterBar.swift
│   ├── FilterSheet.swift
│   └── MapStylePicker.swift
├── Restaurant/
│   ├── RestaurantDetailView.swift
│   └── RatingSection.swift
├── Search/
│   └── SearchView.swift          # Restaurants + people, debounced
├── Lists/
│   ├── ListsView.swift           # 3 fixed + custom lists
│   ├── ListDetailView.swift
│   ├── PublicListView.swift      # Shareable list (no auth required)
│   ├── CreateListSheet.swift
│   └── AddToListSheet.swift
├── Feed/
│   └── FeedView.swift            # Activity feed, cursor pagination
├── Profile/
│   ├── ProfileView.swift         # Own profile tab
│   ├── PublicProfileView.swift   # Other users
│   ├── EditProfileSheet.swift
│   └── FollowSheet.swift         # Followers / following list
├── Shared/
│   ├── SupabaseClient.swift      # Singleton client
│   ├── RestaurantStore.swift     # @Observable, all restaurants + statusMap
│   ├── ListsStore.swift          # @Observable, custom lists
│   ├── MapStore.swift            # @Observable, style, user location
│   ├── Models.swift              # Restaurant, UserProfile, List, FeedItem types
│   ├── Theme.swift               # Color extensions (Chalk Market palette)
│   └── Extensions/
│       ├── Color+Hex.swift
│       └── Date+Relative.swift
└── Resources/
    ├── Assets.xcassets
    ├── Config.xcconfig            # API keys (not committed)
    └── Info.plist
```

---

## Screens & Navigation

### Auth Flow
`SplashView` checks `AuthStore.session`:
- No session → `OnboardingView` (first launch) or `LoginView`
- Session exists → `MainTabView`

### Main Tab Bar (`MainTabView`)
| Tab | Root | Push destinations |
|-----|------|-------------------|
| Map | `MapView` + `RestaurantPanel` sheet | `RestaurantDetailView` |
| Search | `SearchView` | `RestaurantDetailView`, `PublicProfileView` |
| Lists | `ListsView` | `ListDetailView` → `RestaurantDetailView` |
| Feed | `FeedView` | `RestaurantDetailView`, `PublicProfileView` |
| Profile | `ProfileView` | `EditProfileSheet`, `PublicProfileView` |

### Shared Destinations
- `RestaurantDetailView` — full detail, rating, status, add to list, directions
- `PublicProfileView` — follow/unfollow, followers/following sheets, their lists
- `PublicListView` — shareable list view (no auth required, deep link target)

### Auth Gate
Unauthenticated taps on rate / add to list / follow present `LoginView` as `.sheet`. No redirect. Mirrors web `AuthModal` behavior.

---

## Data Flow

### Supabase Client
Singleton `SupabaseClient` initialized from `Config.xcconfig`:
```swift
// Shared/SupabaseClient.swift
let supabase = SupabaseClient(
    supabaseURL: URL(string: Config.supabaseURL)!,
    supabaseKey: Config.supabaseAnonKey
)
```
Keys in `Config.xcconfig`, gitignored. Injected into schemes via `SUPABASE_URL` and `SUPABASE_ANON_KEY` xcconfig variables.

### RestaurantStore
- On launch: paginated `.range()` fetches until all rows retrieved (mirrors web's `/api/restaurants` bypass of 1000-row PostgREST cap)
- 30-minute in-memory TTL (`lastFetched` timestamp)
- `statusMap: [String: RestaurantStatus]` — populated after auth from `user_restaurants`
- `selectedId: String?` — opens `RestaurantPanel`
- `searchFilterIds: Set<String>?` — when set, map shows only these IDs
- `filters: (cuisines: Set<String>, prices: Set<Int>)` — active filters
- `filteredRestaurants: [Restaurant]` — computed from above

### AuthStore
- Observes `supabase.auth.authStateChanges` async stream on init
- Session persisted in keychain automatically by Supabase Swift SDK
- Sign in with Apple flow:
  1. `ASAuthorizationController` → get `identityToken`
  2. `supabase.auth.signInWithIdToken(credentials: .init(provider: .apple, idToken: token))`
  3. `AuthStore.session` updates → `RootView` switches to tab bar

### ListsStore
- Fetches on `ListsView.onAppear` (no TTL, always fresh — same as web)
- Insert/update/delete via direct Supabase calls

### Feed
- `FeedView` fetches first page on appear
- "Load more" appends via `lt("updated_at", cursor)` — cursor = last item's `updated_at`
- Requires auth; shows sign-in empty state if no session

### Map Markers
GeoJSON source updated via Mapbox SDK when `filteredRestaurants` or `statusMap` changes:
- Red: unsaved
- Orange: want_to_try  
- Green: visited
- Amber: favourite

Tapping annotation → `RestaurantStore.selectedId = id` → `RestaurantPanel` appears.

### Error Handling
- `Result<T, Error>` for all async calls
- 401 / no session → present `LoginView` sheet
- Network errors → inline retry banner (`.overlay` on relevant view)
- No silent failures; no app crashes on auth errors

---

## UI Conventions

### Chalk Market Palette
```swift
// Shared/Theme.swift
extension Color {
    static let frBackground = Color(hex: "#F5F0E8")
    static let frCard       = Color(hex: "#EDE6D8")
    static let frAccent     = Color(hex: "#D44C2A")
    static let frText       = Color(hex: "#2C2420")
    static let frBorder     = Color(hex: "#D4C8B4")
}
```
Dark mode via `@Environment(\.colorScheme)` — alternate values defined alongside each token.

### Typography
System font (`-apple-system`) with Dynamic Type. No custom fonts unless added to web app first.

### Reusable Components
| Component | Purpose |
|-----------|---------|
| `RestaurantCard` | Image, name, cuisine, price label, status badge |
| `RatingRow` | 1–10 stepper + status picker |
| `ListCard` | Emoji, title, restaurant count |
| `UserRow` | Avatar, display name, username, follow button |
| `StatusBadge` | Colored pill (matches marker colors) |
| `AuthGateButton` | Wraps action, fires login sheet if unauthenticated |

### Sheets & Navigation
- `RestaurantPanel`: `.sheet` + `.presentationDetents([.medium, .large])` — swipe up for full detail
- Auth sheets: `.fullScreenCover`
- `CreateListSheet`, `AddToListSheet`, `EditProfileSheet`: `.sheet`
- `NavigationStack` with typed `NavigationPath` per tab

### Persistence
- Map style preference: `UserDefaults`
- Recent searches: `UserDefaults` key `foodraccoon:recent-searches`, max 8 (same as web)
- Auth session: Supabase Swift SDK keychain (automatic)

---

## Out of Scope
- Admin panel (web-only, service-role operations)
- PWA install banner, SW update reloader
- Push notifications (future phase)
- Widget / App Clip (future phase)
