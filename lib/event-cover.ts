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

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&h=400&fit=crop";

function presetForQuery(query: string): string | null {
  const lower = query.toLowerCase();
  for (const [key, url] of Object.entries(VENUE_PRESETS)) {
    if (lower.includes(key)) return url;
  }
  return null;
}

export interface CoverSuggestion {
  url: string;
  label: string;
  source: "preset" | "mapbox" | "fallback";
}

/** Suggest cover images from venue keywords or geocoded location (e.g. Austin skyline map). */
export async function suggestEventCovers(input: {
  venue?: string | null;
  address?: string | null;
  destination?: string | null;
}): Promise<{ suggestions: CoverSuggestion[]; query: string }> {
  const query = [input.venue, input.destination, input.address].filter(Boolean).join(", ").trim();
  if (!query) {
    return { suggestions: [], query: "" };
  }

  const suggestions: CoverSuggestion[] = [];

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
      url: FALLBACK_COVER,
      label: "Generic event",
      source: "fallback",
    });
  }

  return { suggestions, query };
}

/** Pick the best cover URL for an event when none was uploaded. */
export async function resolveEventCoverUrl(input: {
  venue?: string | null;
  address?: string | null;
  destination?: string | null;
}): Promise<string | null> {
  const { suggestions } = await suggestEventCovers(input);
  return suggestions[0]?.url ?? null;
}
