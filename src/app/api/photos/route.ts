const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// cover_photo_url should hold a bare photo_reference, but rows written
// before the key-leak fix still hold the full googleapis URL (with the
// key baked in) until scripts/strip-photo-keys.ts backfills them —
// unwrap those so photos keep working in the meantime.
function extractRef(value: string): string | null {
  if (!value.startsWith("http")) return value;
  try {
    return new URL(value).searchParams.get("photo_reference");
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawRef = searchParams.get("ref");

  if (!rawRef || rawRef.length > 2000 || /[<>"{}|\\^`]/.test(rawRef)) {
    return new Response(null, { status: 400 });
  }
  const ref = extractRef(rawRef);
  if (!ref) {
    return new Response(null, { status: 400 });
  }
  if (!GOOGLE_API_KEY) {
    return new Response(null, { status: 503 });
  }

  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${encodeURIComponent(ref)}&key=${GOOGLE_API_KEY}`;
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
