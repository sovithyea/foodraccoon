import mbxDirections from "@mapbox/mapbox-sdk/services/directions";

const directionsClient = mbxDirections({
  accessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN!,
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const profile = searchParams.get("profile") ?? "walking";

  if (!from || !to) {
    return Response.json({ error: "Missing from or to params" }, { status: 400 });
  }

  const [fromLng, fromLat] = from.split(",").map(Number);
  const [toLng, toLat] = to.split(",").map(Number);

  if ([fromLng, fromLat, toLng, toLat].some(isNaN)) {
    return Response.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const validProfile = profile === "driving" ? "driving" : "walking";

  try {
    const res = await directionsClient
      .getDirections({
        profile: `mapbox/${validProfile}` as Parameters<typeof directionsClient.getDirections>[0]["profile"],
        waypoints: [
          { coordinates: [fromLng, fromLat] },
          { coordinates: [toLng, toLat] },
        ],
        steps: true,
        geometries: "geojson",
        overview: "full",
      })
      .send();

    const route = res.body.routes?.[0];
    if (!route) {
      return Response.json({ error: "No route found" }, { status: 404 });
    }

    return Response.json({
      geometry: route.geometry,
      distance: route.distance,
      duration: route.duration,
      steps: route.legs[0].steps.map((s) => ({
        instruction: s.maneuver.instruction,
        distance: s.distance,
        duration: s.duration,
        type: s.maneuver.type,
        modifier: s.maneuver.modifier,
      })),
    });
  } catch {
    return Response.json({ error: "Failed to fetch directions" }, { status: 500 });
  }
}
