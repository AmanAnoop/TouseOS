"use client";

import { MapPin } from "lucide-react";
import { Input } from "@/components/ui";
import { buildMapsUrl } from "@/lib/maps-link";

export interface LocationFieldValues {
  venueName: string;
  address: string;
  departureLocation: string;
  meetingPoint: string;
  destination: string;
}

interface LocationFieldsProps {
  values: LocationFieldValues;
  onChange: (patch: Partial<LocationFieldValues>) => void;
  /** Show departure/meeting fields (travel trips). */
  variant?: "event" | "travel";
  disabled?: boolean;
}

export function LocationFields({
  values,
  onChange,
  variant = "event",
  disabled,
}: LocationFieldsProps) {
  const mapsUrl = buildMapsUrl({
    venueName: values.venueName || values.destination,
    address: values.address,
    destination: values.destination,
    meetingPoint: values.meetingPoint,
  });

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
        <MapPin size={15} />
        Location
      </p>

      {variant === "travel" && (
        <>
          <Input
            label="Destination (city / region)"
            placeholder="Columbus, OH"
            value={values.destination}
            onChange={(e) => onChange({ destination: e.target.value })}
            disabled={disabled}
          />
          <Input
            label="Venue / facility name"
            placeholder="Nationwide Arena, hotel name..."
            value={values.venueName}
            onChange={(e) => onChange({ venueName: e.target.value })}
            disabled={disabled}
          />
        </>
      )}

      {variant === "event" && (
        <Input
          label="Venue name"
          placeholder="Chapter house, ballroom, field..."
          icon={<MapPin size={15} />}
          value={values.venueName || values.destination}
          onChange={(e) => onChange({ venueName: e.target.value, destination: e.target.value })}
          disabled={disabled}
        />
      )}

      <Input
        label="Street address"
        placeholder="123 Main St, City, ST 12345"
        value={values.address}
        onChange={(e) => onChange({ address: e.target.value })}
        disabled={disabled}
      />

      {variant === "travel" && (
        <>
          <Input
            label="Team departure point"
            placeholder="Campus rec center parking lot"
            value={values.departureLocation}
            onChange={(e) => onChange({ departureLocation: e.target.value })}
            disabled={disabled}
          />
          <Input
            label="Meet-up / rally point"
            placeholder="Where players gather before leaving"
            value={values.meetingPoint}
            onChange={(e) => onChange({ meetingPoint: e.target.value })}
            disabled={disabled}
          />
        </>
      )}

      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
        >
          Preview on map →
        </a>
      )}
    </div>
  );
}
