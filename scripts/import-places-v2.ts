import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  try {
    const raw = readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
    }
  } catch {
    // env may already be set in shell
  }
}

loadEnv()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY!

// ─── Types ───────────────────────────────────────────────────────────────────

type PlaceResult = {
  place_id: string
  name: string
  vicinity: string
  geometry: { location: { lat: number; lng: number } }
  price_level?: number
  rating?: number
  user_ratings_total?: number
  types: string[]
  business_status?: string
}

type PlaceDetails = {
  place_id: string
  name: string
  formatted_address: string
  formatted_phone_number?: string
  website?: string
  opening_hours?: { weekday_text: string[] }
  photos?: { photo_reference: string }[]
  price_level?: number
  rating?: number
  user_ratings_total?: number
  geometry: { location: { lat: number; lng: number } }
  types: string[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

function mapPriceLevel(level?: number): number | null {
  if (level == null) return null
  return Math.max(1, Math.min(4, level))
}

function inferCuisineTypes(types: string[], name: string): string[] {
  const cuisines: string[] = []
  const nameLower = name.toLowerCase()

  const typeMap: Record<string, string> = {
    cafe: 'Cafe', bakery: 'Cafe',
    bar: 'Bar', night_club: 'Bar',
    meal_takeaway: 'Street food',
    meal_delivery: 'Street food',
    food: 'International',
  }
  const nameMap: Record<string, string> = {
    pizza: 'Pizza', sushi: 'Japanese', ramen: 'Japanese', japanese: 'Japanese',
    burger: 'Western', steak: 'Western', grill: 'Western', western: 'Western',
    khmer: 'Khmer', cambodia: 'Khmer', cambodian: 'Khmer',
    pho: 'Vietnamese', viet: 'Vietnamese', vietnamese: 'Vietnamese',
    thai: 'Thai', india: 'Indian', indian: 'Indian', curry: 'Indian',
    italian: 'Italian', pasta: 'Italian',
    coffee: 'Cafe', cafe: 'Cafe', bakery: 'Cafe', boulangerie: 'Cafe',
    noodle: 'Noodles', noodles: 'Noodles',
    vegan: 'Vegan', vegetarian: 'Vegetarian',
    chinese: 'Asian', korean: 'Asian', asian: 'Asian',
    seafood: 'Seafood', bbq: 'BBQ', barbecue: 'BBQ',
    mexican: 'Western', sandwich: 'Western',
    dessert: 'Cafe', ice: 'Cafe', milk: 'Cafe',
    healthy: 'Healthy', salad: 'Healthy',
    bar: 'Bar', pub: 'Bar', brewery: 'Bar',
    street: 'Street food', market: 'Street food',
  }

  for (const [key, val] of Object.entries(typeMap)) {
    if (types.includes(key) && !cuisines.includes(val)) cuisines.push(val)
  }
  for (const [key, val] of Object.entries(nameMap)) {
    if (nameLower.includes(key) && !cuisines.includes(val)) cuisines.push(val)
  }

  if (cuisines.length === 0) cuisines.push('International')
  return cuisines
}

function inferDistrict(lat: number, lng: number): string {
  if (lng > 104.925 && lat > 11.565 && lat < 11.590) return 'Riverside'
  if (lng > 104.915 && lng < 104.930 && lat > 11.555 && lat < 11.572) return 'BKK1'
  if (lng > 104.908 && lng < 104.920 && lat > 11.558 && lat < 11.568) return 'BKK2'
  if (lat < 11.545 && lat > 11.520 && lng > 104.900) return 'Toul Tom Poung'
  if (lat > 11.568 && lat < 11.590 && lng > 104.910 && lng < 104.928) return 'Daun Penh'
  if (lat < 11.555 && lat > 11.530 && lng > 104.910 && lng < 104.935) return 'Chamkarmon'
  if (lat > 11.572 && lng < 104.915) return 'Toul Kork'
  if (lng < 104.880 && lat > 11.560) return 'Sen Sok'
  if (lng < 104.870) return 'Pochentong'
  if (lat > 11.590) return 'Russei Keo'
  if (lng > 104.935 && lat > 11.560) return 'Chroy Changvar'
  if (lat < 11.520 && lng > 104.920) return 'Chbar Ampov'
  if (lat < 11.520) return 'Mean Chey'
  if (lat > 11.580 && lng > 104.920) return 'Prek Leap'
  return 'Daun Penh'
}

// ─── API calls ────────────────────────────────────────────────────────────────

async function nearbySearch(
  lat: number,
  lng: number,
  keyword: string,
  radius: number,
  pageToken?: string
): Promise<{ results: PlaceResult[]; nextPageToken?: string }> {
  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    radius: String(radius),
    type: 'restaurant',
    keyword,
    key: GOOGLE_API_KEY,
    ...(pageToken ? { pagetoken: pageToken } : {}),
  })

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`
  )
  const data = await res.json()

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    console.error('Nearby search error:', data.status, data.error_message)
    return { results: [] }
  }

  return {
    results: (data.results ?? []).filter(
      (r: PlaceResult) => r.business_status !== 'CLOSED_PERMANENTLY'
    ),
    nextPageToken: data.next_page_token,
  }
}

async function textSearch(query: string): Promise<PlaceResult[]> {
  const params = new URLSearchParams({
    query,
    key: GOOGLE_API_KEY,
    region: 'kh',
  })

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`
  )
  const data = await res.json()

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    console.error('Text search error:', data.status, data.error_message)
    return []
  }

  return (data.results ?? []).filter(
    (r: PlaceResult) => r.business_status !== 'CLOSED_PERMANENTLY'
  )
}

async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: [
      'place_id', 'name', 'formatted_address', 'formatted_phone_number',
      'website', 'opening_hours', 'photos', 'price_level', 'rating',
      'user_ratings_total', 'geometry', 'types',
    ].join(','),
    key: GOOGLE_API_KEY,
  })

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${params}`
  )
  const data = await res.json()

  if (data.status !== 'OK') {
    console.warn(`Details failed for ${placeId}:`, data.status)
    return null
  }

  return data.result
}

function photoUrl(photoRef: string, maxWidth = 800): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoRef}&key=${GOOGLE_API_KEY}`
}

// ─── Data ─────────────────────────────────────────────────────────────────────

function generateCityGrid(): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = []
  for (let lat = 11.45; lat <= 11.65; lat += 0.015) {
    for (let lng = 104.78; lng <= 105.00; lng += 0.015) {
      points.push({
        lat: Math.round(lat * 10000) / 10000,
        lng: Math.round(lng * 10000) / 10000,
      })
    }
  }
  return points // ~225 points
}

const GRID_KEYWORDS = [
  'restaurant', 'cafe', 'coffee', 'food', 'bar',
  'khmer', 'noodles', 'bakery', 'street food', 'dessert',
]

const COMPLEXES = [
  { name: 'TK Avenue',              lat: 11.5756, lng: 104.9078, radius: 150 },
  { name: 'Aeon Mall 1 Monivong',   lat: 11.5512, lng: 104.9206, radius: 200 },
  { name: 'Aeon Mall 2 Sen Sok',    lat: 11.5987, lng: 104.8897, radius: 200 },
  { name: 'Aeon Mall 3 Mean Chey',  lat: 11.5234, lng: 104.9156, radius: 200 },
  { name: 'Chip Mong 271',          lat: 11.5623, lng: 104.9187, radius: 150 },
  { name: 'Chip Mong Noro',         lat: 11.5534, lng: 104.9012, radius: 150 },
  { name: 'Sorya Shopping Center',  lat: 11.5698, lng: 104.9198, radius: 120 },
  { name: 'Parkway Square',         lat: 11.5889, lng: 104.8978, radius: 150 },
  { name: 'Exchange Square',        lat: 11.5712, lng: 104.9289, radius: 120 },
  { name: 'Olympia Mall',           lat: 11.5556, lng: 104.9145, radius: 150 },
  { name: 'Pencil Sovannaphumi',    lat: 11.5634, lng: 104.8934, radius: 150 },
  { name: 'Factory Phnom Penh',     lat: 11.5589, lng: 104.9198, radius: 100 },
  { name: 'Block 11 BKK1',          lat: 11.5601, lng: 104.9223, radius: 80  },
  { name: 'The Place Sisowath',     lat: 11.5701, lng: 104.9312, radius: 100 },
  { name: 'Bassac Lane',            lat: 11.5578, lng: 104.9256, radius: 80  },
  { name: 'Street 308 area',        lat: 11.5623, lng: 104.9234, radius: 100 },
  { name: 'Street 278 BKK1',        lat: 11.5589, lng: 104.9212, radius: 100 },
  { name: 'Riverside Sisowath',     lat: 11.5712, lng: 104.9321, radius: 150 },
  { name: 'Night Market Riverside', lat: 11.5689, lng: 104.9298, radius: 100 },
  { name: 'Russian Market TTp',     lat: 11.5467, lng: 104.9178, radius: 200 },
  { name: 'Central Market',         lat: 11.5689, lng: 104.9212, radius: 150 },
  { name: 'Orussey Market',         lat: 11.5623, lng: 104.9145, radius: 150 },
  { name: 'Olympic Market',         lat: 11.5556, lng: 104.9156, radius: 150 },
  { name: 'Pochentong Airport area', lat: 11.5467, lng: 104.8456, radius: 300 },
  { name: 'Sen Sok commercial',      lat: 11.5934, lng: 104.8867, radius: 300 },
  { name: 'Chbar Ampov center',      lat: 11.5234, lng: 104.9389, radius: 200 },
  { name: 'Chroy Changvar tip',      lat: 11.5934, lng: 104.9456, radius: 200 },
  { name: 'Toul Kork center',        lat: 11.5823, lng: 104.9089, radius: 200 },
  { name: 'Mean Chey south',         lat: 11.5123, lng: 104.9212, radius: 200 },
  { name: 'Russei Keo north',        lat: 11.6023, lng: 104.9045, radius: 200 },
]

const TARGETED_SEARCHES = [
  'Brown Coffee Phnom Penh',
  'Koi Cafe Phnom Penh',
  'Joma Bakery Cafe Phnom Penh',
  'BlackBird Coffee Phnom Penh',
  'Northbridge Coffee Phnom Penh',
  'Craftsman Coffee Phnom Penh',
  'Cups and Catches Phnom Penh',
  'Cafe Yejj Phnom Penh',
  'Sleuk Chak Cafe Phnom Penh',
  'The Little Red Fox Espresso Phnom Penh',
  'Cloud 9 Cafe Phnom Penh',
  'Eleven One Kitchen Phnom Penh',
  'The Bun Phnom Penh',
  'Eric Kayser Phnom Penh',
  'Merci Bakery Phnom Penh',
  'La Boulangerie Phnom Penh',
  'Freebird Bakery Phnom Penh',
  'Chez Eric Patisserie Phnom Penh',
  'Baked Goodness Phnom Penh',
  'Romdeng Restaurant Phnom Penh',
  'Malis Restaurant Phnom Penh',
  'Khmer Surin Phnom Penh',
  'Sugar Palm Phnom Penh',
  'Sovanna BBQ Phnom Penh',
  'Nyam Restaurant Phnom Penh',
  'Deco Restaurant Phnom Penh',
  'Vann Restaurant Phnom Penh',
  'Origami Restaurant Phnom Penh',
  'Sakura Japanese Restaurant Phnom Penh',
  'Sushi Bar Hasegawa Phnom Penh',
  'Kichi Kichi Phnom Penh',
  'Oskar Bistro Phnom Penh',
  'Broken Plate Phnom Penh',
  'The Exchange Phnom Penh',
  'Topaz Restaurant Phnom Penh',
  'Comme a la Maison Phnom Penh',
  'Villa Langka Phnom Penh',
  'Foreign Correspondents Club Phnom Penh',
  'Riverside Bistro Phnom Penh',
  'Botanico Phnom Penh',
  'Sundown Social Club Phnom Penh',
  'Eclipse Sky Bar Phnom Penh',
  'The Mansion Phnom Penh',
  'Zoul Restaurant Phnom Penh',
  'Java Cafe Phnom Penh',
  'L Annexe French Restaurant Phnom Penh',
  'Harry Bar Restaurant Phnom Penh',
  'Shiva Shakti Phnom Penh',
  'Flavors of India Phnom Penh',
  'Taste of India Phnom Penh',
  'Bangkok Recipe Phnom Penh',
  'Mama Wong Phnom Penh',
  'Chinese House Phnom Penh',
  'KFC Phnom Penh',
  'McDonald Phnom Penh',
  'Burger King Phnom Penh',
  'Dairy Queen Phnom Penh',
  'The Pizza Company Phnom Penh',
  'Pizza Hut Phnom Penh',
  'Domino Pizza Phnom Penh',
  'Swensens Phnom Penh',
  'Lotteria Phnom Penh',
  'BBQ Chicken Phnom Penh',
  'Gong Cha Phnom Penh',
  'ShareTea Phnom Penh',
  'Tiger Sugar Phnom Penh',
  'Ding Tea Phnom Penh',
  'Meet Fresh Phnom Penh',
  'Ochaya Phnom Penh',
  'Bassac Lane restaurants Phnom Penh',
  'Street 308 restaurants Phnom Penh',
  'BKK1 restaurants Phnom Penh',
  'Toul Tom Poung restaurants Phnom Penh',
  'Pochentong restaurants Phnom Penh',
]

// ─── Import logic ─────────────────────────────────────────────────────────────

async function upsertRestaurant(details: PlaceDetails): Promise<boolean> {
  const { lat, lng } = details.geometry.location

  if (lat < 11.40 || lat > 11.70 || lng < 104.75 || lng > 105.10) {
    return false
  }

  const row = {
    google_place_id:     details.place_id,
    name:                details.name,
    address:             details.formatted_address,
    district:            inferDistrict(lat, lng),
    latitude:            lat,
    longitude:           lng,
    cuisine_type:        inferCuisineTypes(details.types, details.name),
    tags:                [],
    price_range:         mapPriceLevel(details.price_level),
    google_rating:       details.rating ?? null,
    google_rating_count: details.user_ratings_total ?? null,
    cover_photo_url:     details.photos?.[0]
                           ? photoUrl(details.photos[0].photo_reference)
                           : null,
    phone:               details.formatted_phone_number ?? null,
    website:             details.website ?? null,
    opening_hours:       details.opening_hours?.weekday_text
                           ? { weekday_text: details.opening_hours.weekday_text }
                           : null,
  }

  const { error } = await supabase
    .from('restaurants')
    .upsert(row, { onConflict: 'google_place_id', ignoreDuplicates: false })

  if (error) {
    console.error(`  x Failed: ${details.name} -- ${error.message}`)
    return false
  }

  return true
}

async function processPlaceIds(
  placeIds: Set<string>,
  label: string
): Promise<{ imported: number; skipped: number }> {
  let imported = 0
  let skipped = 0
  let processed = 0

  for (const placeId of placeIds) {
    processed++
    if (processed % 50 === 0) {
      console.log(`  [${label}] ${processed}/${placeIds.size} processed...`)
    }

    const details = await getPlaceDetails(placeId)
    await sleep(120)

    if (!details) { skipped++; continue }

    const ok = await upsertRestaurant(details)
    if (ok) {
      console.log(`  + ${details.name} (${inferDistrict(details.geometry.location.lat, details.geometry.location.lng)})`)
      imported++
    } else {
      skipped++
    }
  }

  return { imported, skipped }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('Foodraccoon -- Comprehensive Phnom Penh Import v2')
  console.log('='.repeat(55))

  const allPlaceIds = new Set<string>()

  // Strategy 1: City grid sweep
  console.log('\nStrategy 1: City grid sweep (225 points x 10 keywords)')
  const gridPoints = generateCityGrid()
  let gridSearchCount = 0

  for (const point of gridPoints) {
    for (const keyword of GRID_KEYWORDS) {
      gridSearchCount++
      if (gridSearchCount % 100 === 0) {
        console.log(`  Grid progress: ${gridSearchCount}/${gridPoints.length * GRID_KEYWORDS.length} searches...`)
      }

      let pageToken: string | undefined
      let page = 0

      do {
        if (pageToken) await sleep(2000)
        const { results, nextPageToken } = await nearbySearch(
          point.lat, point.lng, keyword, 1000, pageToken
        )
        results.forEach(r => allPlaceIds.add(r.place_id))
        pageToken = nextPageToken
        page++
        await sleep(150)
      } while (pageToken && page < 3)
    }
  }

  console.log(`  Grid sweep done. Unique places so far: ${allPlaceIds.size}`)

  // Strategy 2: Complex/mall deep search
  console.log('\nStrategy 2: Complex/mall deep search')

  for (const complex of COMPLEXES) {
    console.log(`  Searching: ${complex.name}`)
    const keywords = ['restaurant', 'cafe', 'food', 'bar', 'coffee']

    for (const keyword of keywords) {
      const { results } = await nearbySearch(
        complex.lat, complex.lng, keyword, complex.radius
      )
      results.forEach(r => allPlaceIds.add(r.place_id))
      await sleep(150)
    }
  }

  console.log(`  Complex search done. Unique places so far: ${allPlaceIds.size}`)

  // Strategy 3: Targeted name searches
  console.log('\nStrategy 3: Targeted name searches')

  for (const query of TARGETED_SEARCHES) {
    console.log(`  Searching: "${query}"`)
    const results = await textSearch(query)
    results.forEach(r => allPlaceIds.add(r.place_id))
    await sleep(200)
  }

  console.log(`  Targeted search done. Total unique places: ${allPlaceIds.size}`)

  // Fetch details + upsert all
  console.log(`\nFetching details and upserting ${allPlaceIds.size} places...`)
  console.log('   (~120ms per place)')

  const { imported, skipped } = await processPlaceIds(allPlaceIds, 'upsert')

  console.log('\n' + '='.repeat(55))
  console.log('Import complete!')
  console.log(`   Imported/updated: ${imported}`)
  console.log(`   Skipped (outside bounds or error): ${skipped}`)
  console.log('   Check: select count(*) from restaurants')
}

run().catch(console.error)
