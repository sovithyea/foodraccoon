import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

async function geocode(query: string): Promise<{ lng: number; lat: number } | null> {
  const encoded = encodeURIComponent(query)
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?country=KH&proximity=104.9282,11.5564&limit=1&access_token=${MAPBOX_TOKEN}`
  const res = await fetch(url)
  const data = await res.json()
  const feature = data.features?.[0]
  if (!feature) return null
  const [lng, lat] = feature.center
  return { lng, lat }
}

async function run() {
  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('id, name, address, district')

  if (error || !restaurants) {
    console.error('Failed to fetch restaurants:', error)
    process.exit(1)
  }

  console.log(`Geocoding ${restaurants.length} restaurants...`)

  for (const r of restaurants) {
    const query = `${r.name}, ${r.address ?? ''}, Phnom Penh, Cambodia`.replace(/,\s*,/, ',')
    console.log(`\nGeocoding: ${r.name}`)
    console.log(`  Query: ${query}`)

    const coords = await geocode(query)

    if (!coords) {
      const fallback = await geocode(`${r.name}, Phnom Penh, Cambodia`)
      if (!fallback) {
        console.log(`  ✗ Could not geocode — skipping`)
        continue
      }
      console.log(`  ✓ Fallback: ${fallback.lat}, ${fallback.lng}`)
      await supabase
        .from('restaurants')
        .update({ latitude: fallback.lat, longitude: fallback.lng })
        .eq('id', r.id)
      continue
    }

    console.log(`  ✓ ${coords.lat}, ${coords.lng}`)
    await supabase
      .from('restaurants')
      .update({ latitude: coords.lat, longitude: coords.lng })
      .eq('id', r.id)

    await new Promise(resolve => setTimeout(resolve, 200))
  }

  console.log('\nDone.')
}

run()
