import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { geocodeAddress, getMapboxToken } from "@/lib/mapbox";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });

  const token = getMapboxToken();
  if (!token) return NextResponse.json({ mapUrl: null, hint: "Maps preview unavailable" });

  const place = await geocodeAddress(q);
  if (!place) return NextResponse.json({ mapUrl: null });

  const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+1a4d3e(${place.lng},${place.lat})/${place.lng},${place.lat},14,0/600x240@2x?access_token=${token}`;

  return NextResponse.json({
    mapUrl,
    lat: place.lat,
    lng: place.lng,
    placeName: place.placeName,
  });
}
