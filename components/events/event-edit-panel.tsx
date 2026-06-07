"use client";

import { useRef, useState } from "react";
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
  const [coverUrl, setCoverUrl] = useState<string | null>(
    event.cover_image_url ? String(event.cover_image_url) : null,
  );
  const [coverUploading, setCoverUploading] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);
  const [isPointOpportunity, setIsPointOpportunity] = useState(Boolean(event.is_point_opportunity));
  const [pointValue, setPointValue] = useState(
    event.point_value != null ? String(event.point_value) : "",
  );
  const [pointCategory, setPointCategory] = useState(String(event.point_category ?? ""));
  const [locationValues, setLocationValues] = useState<LocationFieldValues>({
    venueName: String(event.location ?? ""),
    address: String(event.address ?? ""),
    destination: String(event.location ?? ""),
    departureLocation: "",
    meetingPoint: "",
  });

  if (!canEdit) return null;

  async function uploadCover(file: File) {
    setCoverUploading(true);
    const body = new FormData();
    body.append("file", file);
    body.append("org_id", orgId);
    const res = await fetch("/api/events/cover-upload", { method: "POST", body });
    setCoverUploading(false);
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Upload failed");
      return;
    }
    setCoverUrl(data.url);
    toast.success("Cover updated");
  }

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
        coverImageUrl: coverUrl,
        isPointOpportunity,
        pointValue: pointValue ? parseInt(pointValue, 10) : null,
        pointCategory: pointCategory || null,
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
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="rounded mt-0.5"
              checked={isPointOpportunity}
              onChange={(e) => setIsPointOpportunity(e.target.checked)}
            />
            <div>
              <p className="text-sm font-medium">Counts toward member points</p>
              <p className="text-xs text-muted-foreground">Check-in earns credit for this event.</p>
            </div>
          </label>
          {isPointOpportunity && (
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Points to award" type="number" value={pointValue} onChange={(e) => setPointValue(e.target.value)} placeholder="Chapter default" />
              <Input label="Category" value={pointCategory} onChange={(e) => setPointCategory(e.target.value)} placeholder="Philanthropy, service..." />
            </div>
          )}
          <div className="space-y-2">
            <p className="text-sm font-medium">Cover image</p>
            {coverUrl && (
              <div className="h-28 rounded-lg bg-cover bg-center border border-border" style={{ backgroundImage: `url(${coverUrl})` }} />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" size="sm" loading={coverUploading} onClick={() => coverRef.current?.click()}>
                {coverUrl ? "Replace cover" : "Upload cover"}
              </Button>
              {coverUrl && (
                <Button type="button" variant="secondary" size="sm" onClick={() => setCoverUrl(null)}>Remove</Button>
              )}
            </div>
            <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadCover(file);
            }} />
          </div>
        </div>
      </Modal>
    </>
  );
}
