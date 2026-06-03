"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Card, CardHeader, Modal } from "@/components/ui";
import { LocationDisplay } from "@/components/location/location-display";
import { LocationFields, type LocationFieldValues } from "@/components/location/location-fields";

export function TripLocationPanel({
  orgId,
  tripId,
  trip,
  canManage,
  onSaved,
}: {
  orgId: string;
  tripId: string;
  trip: Record<string, unknown>;
  canManage: boolean;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<LocationFieldValues>({
    destination: String(trip.destination ?? ""),
    venueName: String(trip.venue_name ?? ""),
    address: String(trip.address ?? ""),
    departureLocation: String(trip.departure_location ?? ""),
    meetingPoint: String(trip.meeting_point ?? ""),
  });

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/sports/travel/${tripId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        destination: values.destination || null,
        venueName: values.venueName || null,
        address: values.address || null,
        departureLocation: values.departureLocation || null,
        meetingPoint: values.meetingPoint || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Could not save locations");
      return;
    }
    toast.success("Trip locations updated");
    setOpen(false);
    onSaved();
  }

  return (
    <Card>
      <CardHeader
        title="Trip locations"
        action={
          canManage ? (
            <Button variant="secondary" size="sm" icon={<Pencil size={14} />} onClick={() => {
              setValues({
                destination: String(trip.destination ?? ""),
                venueName: String(trip.venue_name ?? ""),
                address: String(trip.address ?? ""),
                departureLocation: String(trip.departure_location ?? ""),
                meetingPoint: String(trip.meeting_point ?? ""),
              });
              setOpen(true);
            }}>
              Edit
            </Button>
          ) : undefined
        }
      />
      <LocationDisplay
        destination={String(trip.destination ?? "")}
        venueName={String(trip.venue_name ?? "")}
        address={String(trip.address ?? "")}
        departureLocation={String(trip.departure_location ?? "")}
        meetingPoint={String(trip.meeting_point ?? "")}
      />
      {!trip.destination && !trip.venue_name && !trip.address && (
        <p className="text-sm text-muted-foreground">No locations added yet.</p>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Edit trip locations"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} loading={saving}>Save</Button>
          </>
        }
      >
        <LocationFields variant="travel" values={values} onChange={(p) => setValues((v) => ({ ...v, ...p }))} />
      </Modal>
    </Card>
  );
}
