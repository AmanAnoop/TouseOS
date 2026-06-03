"use client";

import { useState, useEffect } from "react";
import { Check, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui";

export default function EventRsvpButton({
  eventId,
  orgId,
  capacity,
  goingCount,
}: {
  eventId: string;
  orgId: string;
  capacity: number | null;
  goingCount: number;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadRsvp() {
      const res = await fetch(
        `/api/events/rsvp?event_id=${encodeURIComponent(eventId)}&org_id=${encodeURIComponent(orgId)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status ?? null);
      }
      setLoading(false);
    }
    loadRsvp();
  }, [eventId, orgId]);

  async function rsvp(newStatus: string) {
    setSaving(true);
    const res = await fetch("/api/events/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        orgId,
        status: newStatus,
        capacity,
        goingCount,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error((await res.json().catch(() => ({}))).error ?? "RSVP failed");
      return;
    }
    const data = await res.json();
    setStatus(data.status);
    if (data.waitlisted) {
      toast.success("Added to waitlist");
      return;
    }
    const label = data.status === "going"
      ? "You're going!"
      : data.status === "not_going"
        ? "RSVP updated"
        : "Marked as maybe";
    toast.success(label);
  }

  if (loading) return <div className="h-12 bg-surface-2 rounded-xl animate-pulse" />;

  if (status === "going") {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 justify-center py-3 rounded-xl bg-greek-50 dark:bg-greek-950/30 text-greek-700 dark:text-greek-400">
          <Check size={16} />
          <span className="font-semibold">You&apos;re going!</span>
        </div>
        <Button variant="secondary" size="sm" onClick={() => rsvp("not_going")} className="flex-shrink-0">
          {saving ? <Loader2 size={14} className="animate-spin" /> : "Cancel"}
        </Button>
      </div>
    );
  }

  if (status === "waitlist") {
    return (
      <div className="flex items-center justify-center py-3 rounded-xl bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700">
        <span className="font-semibold text-sm">On waitlist</span>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button onClick={() => rsvp("going")} loading={saving} className="flex-1 h-11 text-base font-semibold">
        ✓ Going
      </Button>
      <Button variant="secondary" onClick={() => rsvp("maybe")} disabled={saving} className="flex-1 h-11">
        Maybe
      </Button>
      <Button variant="secondary" onClick={() => rsvp("not_going")} disabled={saving} className="px-3 h-11">
        ✕
      </Button>
    </div>
  );
}
