"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, ChevronLeft, DollarSign, Image as ImageIcon, Users } from "lucide-react";
import toast from "react-hot-toast";
import { useOrg } from "@/hooks/use-org";
import { LocationFields, type LocationFieldValues } from "@/components/location/location-fields";
import { Button, Input, PageHeader, Select, Textarea, Alert } from "@/components/ui";

import { eventTypesForOrgType } from "@/lib/org-product";

export default function NewEventPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { orgId, orgType } = useOrg();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    type: "other",
    description: "",
    locationValues: {
      venueName: "",
      address: "",
      destination: "",
      departureLocation: "",
      meetingPoint: "",
    } as LocationFieldValues,
    startsAt: "",
    endsAt: "",
    rsvpEnabled: true,
    rsvpLimit: "",
    waitlistEnabled: false,
    showGuestList: false,
    alcohol: false,
    riskLevel: "low",
    budgetAmount: "",
    dresscode: "",
    playlistUrl: "",
    theme: "",
    isPrivate: false,
  });

  const eventTypes = eventTypesForOrgType(orgType || "general_org");

  useEffect(() => {
    const type = searchParams.get("type");
    const inviteOnly = searchParams.get("invite_only");
    const types = eventTypesForOrgType(orgType || "general_org");
    if (type) {
      const normalized = type === "brotherhood" ? "brotherhood" : type;
      if (types.some((t) => t.value === normalized)) {
        setForm((f) => ({ ...f, type: normalized }));
      }
    }
    if (inviteOnly === "true" || inviteOnly === "1") {
      setForm((f) => ({ ...f, isPrivate: true }));
    }
  }, [searchParams, orgType]);

  async function createEvent() {
    if (!orgId || !form.title || !form.startsAt) return;
    setSaving(true);

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        title: form.title,
        type: form.type,
        description: form.description || null,
        location: form.locationValues.venueName || null,
        address: form.locationValues.address || null,
        startsAt: form.startsAt,
        endsAt: form.endsAt || null,
        rsvpEnabled: form.rsvpEnabled,
        rsvpLimit: form.rsvpLimit ? parseInt(form.rsvpLimit) : null,
        waitlistEnabled: form.waitlistEnabled,
        showGuestList: form.showGuestList,
        alcohol: form.alcohol,
        riskLevel: form.riskLevel,
        budgetAmount: form.budgetAmount ? parseFloat(form.budgetAmount) : null,
        dresscode: form.dresscode || null,
        playlistUrl: form.playlistUrl || null,
        theme: form.theme || null,
        isPrivate: form.isPrivate,
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Failed to create event");
      return;
    }

    const data = await res.json();
    toast.success("Event created!");
    router.push(`/events/${data.id}`);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-surface-1 text-muted-foreground">
          <ChevronLeft size={20} />
        </button>
        <PageHeader title="Create event" description="Fill in the details for your event" />
      </div>

      {/* Basic info */}
      <div className="space-y-4">
        <Input label="Event title" required placeholder="Spring Formal 2025" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />

        <div className="grid sm:grid-cols-2 gap-3">
          <Select
            label="Event type"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            options={eventTypes}
          />
          <Select
            label="Risk level"
            value={form.riskLevel}
            onChange={(e) => setForm({ ...form, riskLevel: e.target.value })}
            options={[
              { value: "low", label: "Low risk" },
              { value: "medium", label: "Medium risk" },
              { value: "high", label: "High risk — requires approval" },
              { value: "critical", label: "Critical risk" },
            ]}
          />
        </div>

        <Textarea
          label="Description"
          placeholder="Tell members what to expect..."
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      {/* Date & location */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Calendar size={15} />Date & location</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Start date & time" type="datetime-local" required value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
          <Input label="End date & time" type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
        </div>
        <LocationFields
          variant="event"
          orgId={orgId ?? undefined}
          values={form.locationValues}
          onChange={(patch) => setForm({ ...form, locationValues: { ...form.locationValues, ...patch } })}
        />
      </div>

      {/* Event page customization */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><ImageIcon size={15} aria-hidden />Event page</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Theme" placeholder="Black tie, Neon nights, Decades..." value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} />
          <Input label="Dress code" placeholder="Cocktail attire, Casual, Costumes..." value={form.dresscode} onChange={(e) => setForm({ ...form, dresscode: e.target.value })} />
        </div>
        <Input label="Playlist link (Spotify, Apple Music)" placeholder="https://open.spotify.com/playlist/..." value={form.playlistUrl} onChange={(e) => setForm({ ...form, playlistUrl: e.target.value })} />
      </div>

      {/* RSVP settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Users size={15} />RSVP settings</h3>
        <div className="space-y-3">
          {[
            { key: "rsvpEnabled", label: "Enable RSVP", description: "Members can RSVP from the event page" },
            { key: "waitlistEnabled", label: "Enable waitlist", description: "Members can join a waitlist if capacity is reached" },
            { key: "showGuestList", label: "Show guest list", description: "Attendees can see who else is going" },
            { key: "isPrivate", label: "Private event", description: "Only visible to members in this org" },
          ].map((opt) => (
            <label key={opt.key} className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="rounded mt-0.5"
                checked={Boolean(form[opt.key as keyof typeof form])}
                onChange={(e) => setForm({ ...form, [opt.key]: e.target.checked })}
              />
              <div>
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>
        <Input label="RSVP capacity (optional)" type="number" placeholder="Leave blank for unlimited" value={form.rsvpLimit} onChange={(e) => setForm({ ...form, rsvpLimit: e.target.value })} />
      </div>

      {/* Finance */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><DollarSign size={15} />Finance</h3>
        <Input label="Event budget ($)" type="number" placeholder="500.00" value={form.budgetAmount} onChange={(e) => setForm({ ...form, budgetAmount: e.target.value })} />

        <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
          <input
            type="checkbox"
            className="rounded mt-0.5"
            checked={form.alcohol}
            onChange={(e) => setForm({ ...form, alcohol: e.target.checked })}
          />
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Alcohol will be present</p>
            <p className="text-xs text-yellow-700 dark:text-yellow-400">A risk management checklist will be required before this event can be approved.</p>
          </div>
        </label>

        {form.riskLevel === "high" && (
          <Alert type="warning" title="High risk events require officer approval before they go live." description="Complete a risk checklist in Risk Management after creating this event." />
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="secondary" onClick={() => router.back()} className="flex-1 officer-touch">Cancel</Button>
        <Button onClick={createEvent} loading={saving} disabled={!form.title || !form.startsAt} className="flex-1 officer-touch">
          Create event
        </Button>
      </div>
    </div>
  );
}
