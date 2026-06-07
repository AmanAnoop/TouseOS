import { ExternalLink, MapPin } from "lucide-react";
import { buildMapsUrl } from "@/lib/maps-link";

export function LocationDisplay({
  venueName,
  address,
  destination,
  departureLocation,
  meetingPoint,
}: {
  venueName?: string | null;
  address?: string | null;
  destination?: string | null;
  departureLocation?: string | null;
  meetingPoint?: string | null;
}) {
  const hasAny = [venueName, address, destination, departureLocation, meetingPoint].some(
    (v) => String(v ?? "").trim(),
  );
  if (!hasAny) return null;

  const mapsUrl = buildMapsUrl({ venueName, address, destination, meetingPoint });

  return (
    <div className="space-y-3">
      {(destination || venueName) && (
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface-1 flex items-center justify-center flex-shrink-0">
            <MapPin size={15} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {[venueName, destination].filter(Boolean).join(" · ")}
            </p>
            {address && <p className="text-xs text-muted-foreground mt-0.5">{address}</p>}
          </div>
        </div>
      )}

      {departureLocation && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Departure:</span> {departureLocation}
        </p>
      )}
      {meetingPoint && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Meet-up:</span> {meetingPoint}
        </p>
      )}

      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          Open in Maps
          <ExternalLink size={14} />
        </a>
      )}
    </div>
  );
}
