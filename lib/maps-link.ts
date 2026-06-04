/** Build a Google Maps search/open URL from venue + address parts. */
export function buildMapsUrl(parts: {
  venueName?: string | null;
  address?: string | null;
  destination?: string | null;
  meetingPoint?: string | null;
}): string | null {
  const segments = [
    parts.meetingPoint,
    parts.venueName,
    parts.address,
    parts.destination,
  ]
    .map((s) => String(s ?? "").trim())
    .filter(Boolean);

  if (!segments.length) return null;
  const query = [...new Set(segments)].join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
