const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// cover_photo_url holds a Places API (New) photo reference. Rows written
// before the key-leak fix still hold the full legacy googleapis URL (with
// the key baked in) until scripts/strip-photo-keys.ts backfills them —
// unwrap those so photos keep working in the meantime.
function extractRef(value: string): string | null {
  if (!value.startsWith("http")) return value;
  try {
    return new URL(value).searchParams.get("photo_reference");
  } catch {
    return null;
  }
}

const SAFE_TOKEN = /^[A-Za-z0-9_-]+$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("placeId");
  const rawRef = searchParams.get("ref");

  if (!placeId || !SAFE_TOKEN.test(placeId)) {
    return new Response(null, { status: 400 });
  }
  if (!rawRef || rawRef.length > 2000 || /[<>"{}|\\^`]/.test(rawRef)) {
    return new Response(null, { status: 400 });
  }
  const ref = extractRef(rawRef);
  if (!ref || !SAFE_TOKEN.test(ref)) {
    return new Response(null, { status: 400 });
  }
  if (!GOOGLE_API_KEY) {
    return new Response(null, { status: 503 });
  }

  // Places API (New) photo media endpoint — the legacy
  // maps.googleapis.com/maps/api/place/photo endpoint rejects these
  // photo references outright, since Google's photo backend now issues
  // only the new-format references regardless of which API returned them.
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}/photos/${encodeURIComponent(ref)}/media?maxWidthPx=800&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url, { redirect: "follow" });

  if (!res.ok) {
    return new Response(null, { status: 502 });
  }

  const body = await res.arrayBuffer();
  return new Response(body, {
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
