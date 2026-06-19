export function staticMapUrl({
  lng,
  lat,
  width = 600,
  height = 200,
  zoom = 15,
  token,
  dark = false,
}: {
  lng: number;
  lat: number;
  width?: number;
  height?: number;
  zoom?: number;
  token: string;
  dark?: boolean;
}): string {
  const style = dark ? "dark-v11" : "light-v11";
  const marker = `pin-s+D44C2A(${lng},${lat})`;
  return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${marker}/${lng},${lat},${zoom},0/${width}x${height}@2x?access_token=${token}`;
}
