import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { geocodeAddress, getMapboxToken } from "@/lib/mapbox";

const VENUE_PRESETS: Record<string, string> = {
  ballroom: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&h=400&fit=crop",
  formal: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&h=400&fit=crop",
  tailgate: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&h=400&fit=crop",
  stadium: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&h=400&fit=crop",
  bar: "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=1200&h=400&fit=crop",
  club: "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=1200&h=400&fit=crop",
  beach: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&h=400&fit=crop",
  lake: "https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=1200&h=400&fit=crop",
  house: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&h=400&fit=crop",
  chapter: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&h=400&fit=crop",
  park: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&h=400&fit=crop",
  philanthropy: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=1200&h=400&fit=crop",
};

function presetForQuery(query: string): string | null {
  const lower = query.toLowerCase();
  for (const [key, url] of Object.entries(VENUE_PRESETS)) {
    if (lower.includes(key)) return url;
  }
  return null;
}

/** Suggest cover images from venue keywords or geocoded location. */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const venue = params.get("venue")?.trim() ?? "";
  const address = params.get("address")?.trim() ?? "";
  const query = [venue, address].filter(Boolean).join(", ");

  if (!query) {
    return NextResponse.json({ suggestions: [] });
  }

  const suggestions: Array<{ url: string; label: string; source: string }> = [];

  const preset = presetForQuery(query);
  if (preset) {
    suggestions.push({ url: preset, label: "Venue style match", source: "preset" });
  }

  const place = await geocodeAddress(query);
  const token = getMapboxToken();
  if (place && token) {
    const staticUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${place.lng},${place.lat},14,0/1200x400@2x?access_token=${token}`;
    suggestions.push({
      url: staticUrl,
      label: place.placeName,
      source: "mapbox",
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&h=400&fit=crop",
      label: "Generic event",
      source: "fallback",
    });
  }

  return NextResponse.json({ suggestions, query });
}
