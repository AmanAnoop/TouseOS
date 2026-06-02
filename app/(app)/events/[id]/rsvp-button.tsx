"use client";

import { useState, useEffect } from "react";
import { Check, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";

export default function EventRsvpButton({
  eventId,
  userId,
  capacity,
  goingCount,
}: {
  eventId: string;
  userId: string;
  capacity: number | null;
  goingCount: number;
}) {
  const supabase = createClient();
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadRsvp() {
      // Find member profile for this user
      const { data: mp } = await supabase
        .from("member_profiles")
        .select("id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (!mp) { setLoading(false); return; }

      const { data: rsvp } = await supabase
        .from("event_rsvps")
        .select("status")
        .eq("event_id", eventId)
        .eq("member_id", mp.id)
        .maybeSingle();

      setStatus(rsvp?.status ?? null);
      setLoading(false);
    }
    loadRsvp();
  }, [supabase, eventId, userId]);

  async function rsvp(newStatus: string) {
    setSaving(true);

    // Get member id
    const { data: mp } = await supabase
      .from("member_profiles")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (!mp) {
      toast.error("Profile not found for this org");
      setSaving(false);
      return;
    }

    if (capacity && newStatus === "going" && goingCount >= capacity) {
      const { error } = await supabase.from("event_rsvps").upsert({
        event_id: eventId,
        member_id: mp.id,
        user_id: userId,
        status: "waitlist",
      }, { onConflict: "event_id,member_id" });
      if (!error) {
        setStatus("waitlist");
        toast.success("Added to waitlist");
      }
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("event_rsvps").upsert({
      event_id: eventId,
      member_id: mp.id,
      user_id: userId,
      status: newStatus,
    }, { onConflict: "event_id,member_id" });

    setSaving(false);
    if (error) { toast.error(error.message); return; }

    setStatus(newStatus);
    const label = newStatus === "going" ? "You&apos;re going! 🎉" : newStatus === "not_going" ? "RSVP updated" : "Marked as maybe";
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
