import { NextResponse } from "next/server";
import { getMapboxToken } from "@/lib/mapbox";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ places: [] });
  }

  const token = getMapboxToken();
  if (!token) {
    return NextResponse.json({ places: [], configured: false });
  }

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`,
  );
  url.searchParams.set("access_token", token);
  url.searchParams.set("limit", "6");
  url.searchParams.set("types", "place,locality,neighborhood,region");

  const res = await fetch(url.toString());
  if (!res.ok) {
    return NextResponse.json({ places: [], error: "Geocoding failed" }, { status: 502 });
  }

  const data = await res.json();
  const places = (data.features ?? []).map((f: { place_name?: string; text?: string }) => ({
    label: String(f.place_name ?? f.text ?? ""),
    value: String(f.place_name ?? f.text ?? ""),
  }));

  return NextResponse.json({ places, configured: true });
}
