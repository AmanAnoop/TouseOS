export interface ItineraryLeg {
  id: string;
  date?: string;
  time?: string;
  title: string;
  location?: string;
  notes?: string;
}

export function legsFromTrip(trip: {
  itinerary_legs?: unknown;
  itinerary?: string | null;
}): ItineraryLeg[] {
  const raw = trip.itinerary_legs;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((leg, i) => {
      const l = leg as Record<string, unknown>;
      return {
        id: String(l.id ?? `leg-${i}`),
        date: l.date ? String(l.date) : undefined,
        time: l.time ? String(l.time) : undefined,
        title: String(l.title ?? "Leg"),
        location: l.location ? String(l.location) : undefined,
        notes: l.notes ? String(l.notes) : undefined,
      };
    });
  }
  if (trip.itinerary?.trim()) {
    return trip.itinerary.split("\n").filter(Boolean).map((line, i) => ({
      id: `text-${i}`,
      title: line.trim(),
    }));
  }
  return [];
}

export function serializeLegsToText(legs: ItineraryLeg[]): string {
  return legs
    .map((leg) => {
      const parts = [
        leg.date ? formatLegDate(leg.date) : null,
        leg.time,
        leg.title,
        leg.location ? `@ ${leg.location}` : null,
        leg.notes ? `(${leg.notes})` : null,
      ].filter(Boolean);
      return parts.join(" · ");
    })
    .join("\n");
}

function formatLegDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return d;
  }
}

export function hasItinerary(trip: {
  itinerary_legs?: unknown;
  itinerary?: string | null;
}): boolean {
  const legs = legsFromTrip(trip);
  return legs.length > 0 || Boolean(trip.itinerary?.trim());
}
