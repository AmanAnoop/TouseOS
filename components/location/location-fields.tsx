"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui";
import { AddressAutocomplete } from "@/components/location/address-autocomplete";
import { buildMapsUrl } from "@/lib/maps-link";

export interface LocationFieldValues {
  venueName: string;
  address: string;
  departureLocation: string;
  meetingPoint: string;
  destination: string;
}

interface LocationPreset {
  id: string;
  label: string;
  venue_name?: string | null;
  address?: string | null;
  destination?: string | null;
  departure_location?: string | null;
  meeting_point?: string | null;
}

interface LocationFieldsProps {
  values: LocationFieldValues;
  onChange: (patch: Partial<LocationFieldValues>) => void;
  /** Show departure/meeting fields (travel trips). */
  variant?: "event" | "travel";
  disabled?: boolean;
  orgId?: string;
}

export function LocationFields({
  values,
  onChange,
  variant = "event",
  disabled,
  orgId,
}: LocationFieldsProps) {
  const [presets, setPresets] = useState<LocationPreset[]>([]);

  const loadPresets = useCallback(async () => {
    if (!orgId) return;
    const res = await fetch(
      `/api/locations/presets?org_id=${encodeURIComponent(orgId)}&kind=${variant}`,
    );
    if (res.ok) setPresets((await res.json()) as LocationPreset[]);
  }, [orgId, variant]);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  const mapsUrl = buildMapsUrl({
    venueName: values.venueName || values.destination,
    address: values.address,
    destination: values.destination,
    meetingPoint: values.meetingPoint,
  });

  function applyPreset(presetId: string) {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;
    onChange({
      venueName: preset.venue_name ?? "",
      address: preset.address ?? "",
      destination: preset.destination ?? "",
      departureLocation: preset.departure_location ?? "",
      meetingPoint: preset.meeting_point ?? "",
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
        <MapPin size={15} />
        Location
      </p>

      {orgId && presets.length > 0 && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Saved location</label>
          <select
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            defaultValue=""
            disabled={disabled}
            onChange={(e) => {
              if (e.target.value) applyPreset(e.target.value);
              e.target.value = "";
            }}
          >
            <option value="">Choose a preset…</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>
      )}

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

      <AddressAutocomplete
        label="Street address"
        placeholder="123 Main St, City, ST 12345"
        value={values.address}
        venueValue={values.venueName || values.destination}
        disabled={disabled}
        onSelect={({ address, venueName }) => {
          const patch: Partial<LocationFieldValues> = { address };
          if (variant === "event" && venueName) {
            patch.venueName = venueName;
            patch.destination = venueName;
          } else if (venueName && !values.venueName) {
            patch.venueName = venueName;
          }
          onChange(patch);
        }}
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
