import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMapboxToken } from "@/lib/mapbox";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q || q.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  const token = getMapboxToken();
  if (!token) {
    return NextResponse.json({ suggestions: [], hint: "Mapbox not configured" });
  }

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`,
  );
  url.searchParams.set("access_token", token);
  url.searchParams.set("limit", "6");
  url.searchParams.set("types", "address,poi,place");

  const res = await fetch(url.toString());
  if (!res.ok) {
    return NextResponse.json({ error: "Geocode failed" }, { status: 502 });
  }

  const data = await res.json();
  const suggestions = (data.features ?? []).map((f: { place_name?: string; text?: string }) => ({
    address: f.place_name ?? q,
    placeName: f.text ?? f.place_name ?? q,
  }));

  return NextResponse.json({ suggestions });
}
