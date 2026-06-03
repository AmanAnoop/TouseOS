"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Input, Modal, Textarea } from "@/components/ui";
import { LocationFields, type LocationFieldValues } from "@/components/location/location-fields";

export function EventEditPanel({
  orgId,
  event,
  canEdit,
  onSaved,
}: {
  orgId: string;
  event: Record<string, unknown>;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(String(event.title ?? ""));
  const [description, setDescription] = useState(String(event.description ?? ""));
  const [startsAt, setStartsAt] = useState(
    event.starts_at ? new Date(String(event.starts_at)).toISOString().slice(0, 16) : "",
  );
  const [endsAt, setEndsAt] = useState(
    event.ends_at ? new Date(String(event.ends_at)).toISOString().slice(0, 16) : "",
  );
  const [locationValues, setLocationValues] = useState<LocationFieldValues>({
    venueName: String(event.location ?? ""),
    address: String(event.address ?? ""),
    destination: String(event.location ?? ""),
    departureLocation: "",
    meetingPoint: "",
  });

  if (!canEdit) return null;

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        title,
        description: description || null,
        location: locationValues.venueName || locationValues.destination || null,
        address: locationValues.address || null,
        startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Could not save");
      return;
    }
    toast.success("Event updated");
    setOpen(false);
    onSaved();
  }

  return (
    <>
      <Button variant="secondary" size="sm" icon={<Pencil size={14} />} onClick={() => setOpen(true)}>
        Edit details
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Edit event"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} loading={saving} disabled={!title || !startsAt}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Starts" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            <Input label="Ends" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </div>
          <LocationFields
            variant="event"
            orgId={orgId}
            values={locationValues}
            onChange={(patch) => setLocationValues((v) => ({ ...v, ...patch }))}
          />
        </div>
      </Modal>
    </>
  );
}
