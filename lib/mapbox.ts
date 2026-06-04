/** Mapbox — server geocoding; client uses NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN with react-map-gl. */

export function isMapboxConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim()
    || process.env.MAPBOX_ACCESS_TOKEN?.trim(),
  );
}

export function getMapboxToken(): string | null {
  return (
    process.env.MAPBOX_ACCESS_TOKEN?.trim()
    ?? process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim()
    ?? null
  );
}

export interface GeocodedPlace {
  address: string;
  lat: number;
  lng: number;
  placeName: string;
}

/** Forward geocode an address string (server-side). */
export async function geocodeAddress(query: string): Promise<GeocodedPlace | null> {
  const token = getMapboxToken();
  if (!token || !query.trim()) return null;

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query.trim())}.json`,
  );
  url.searchParams.set("access_token", token);
  url.searchParams.set("limit", "1");
  url.searchParams.set("types", "address,poi,place");

  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature?.center) return null;

  const [lng, lat] = feature.center as [number, number];
  return {
    address: feature.place_name ?? query,
    lat,
    lng,
    placeName: feature.text ?? query,
  };
}
