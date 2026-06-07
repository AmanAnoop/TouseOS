"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { buildMapsUrl } from "@/lib/maps-link";

export function EventMapPreview({
  venueName,
  address,
}: {
  venueName?: string | null;
  address?: string | null;
}) {
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const query = [venueName, address].filter(Boolean).join(", ");
  const directionsUrl = buildMapsUrl({ venueName, address });

  useEffect(() => {
    if (!query || query.length < 3) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/locations/static-map?q=${encodeURIComponent(query)}`);
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as { mapUrl?: string | null };
      if (!cancelled && data.mapUrl) setMapUrl(data.mapUrl);
    })();
    return () => { cancelled = true; };
  }, [query]);

  if (!query) return null;

  return (
    <div className="space-y-2">
      {mapUrl && (
        <a
          href={directionsUrl ?? mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-xl overflow-hidden border border-border group"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mapUrl}
            alt={`Map preview for ${venueName ?? address}`}
            className="w-full h-40 object-cover group-hover:opacity-90 transition-opacity"
          />
        </a>
      )}
      {directionsUrl && (
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-greek-600 hover:underline"
        >
          Get directions
          <ExternalLink size={14} />
        </a>
      )}
    </div>
  );
}
