"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import { Button, Card } from "@/components/ui";
import { Calendar, CheckCircle2, MapPin } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import type { PnmRsvpStatus } from "@/lib/pnm-invite";

interface InvitePayload {
  invite: {
    rsvpStatus: PnmRsvpStatus;
    rsvpAt: string | null;
    checkedIn: boolean;
    pnmFirstName: string;
  };
  event: {
    id: string;
    title: string;
    description: string | null;
    startsAt: string;
    endsAt: string | null;
    location: string | null;
    address: string | null;
    dressCode: string | null;
    coverImageUrl: string | null;
    type: string;
    isPast: boolean;
  };
  org: {
    name: string;
    logoUrl: string | null;
    primaryColor: string | null;
  } | null;
}

export default function PnmEventInvitePage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<InvitePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/events/pnm-invite?token=${encodeURIComponent(token)}`);
    if (!res.ok) {
      setLoading(false);
      return;
    }
    setData((await res.json()) as InvitePayload);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function rsvp(status: PnmRsvpStatus) {
    setSubmitting(true);
    const res = await fetch("/api/events/pnm-rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, status }),
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error((await res.json().catch(() => ({}))).error ?? "Could not update RSVP");
      return;
    }
    const json = await res.json();
    setData((prev) =>
      prev
        ? {
            ...prev,
            invite: { ...prev.invite, rsvpStatus: json.status, rsvpAt: json.rsvpAt },
          }
        : prev,
    );
    toast.success(status === "going" ? "You're on the list!" : "RSVP updated");
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading invite…</div>;
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center text-muted-foreground">
        This invite link is invalid or has expired.
      </div>
    );
  }

  const { invite, event, org } = data;
  const accent = org?.primaryColor ?? "#059669";

  return (
    <div className="min-h-screen bg-background">
      <div
        className="relative h-56 sm:h-64 bg-gradient-to-br from-greek-600 to-greek-800"
        style={
          event.coverImageUrl
            ? { backgroundImage: `url(${event.coverImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          {org && (
            <p className="text-white/80 text-xs mb-1">{org.name}</p>
          )}
          <h1 className="text-2xl font-bold text-white leading-tight">{event.title}</h1>
          <p className="text-white/90 text-sm mt-1">Hi {invite.pnmFirstName} — you&apos;re invited!</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {invite.rsvpStatus !== "pending" && (
          <Card padding="sm" className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 size={18} />
              <span className="text-sm font-medium">
                RSVP: {invite.rsvpStatus}
                {invite.rsvpAt ? ` · ${new Date(invite.rsvpAt).toLocaleString()}` : ""}
              </span>
            </div>
          </Card>
        )}

        {!event.isPast ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button
              onClick={() => rsvp("going")}
              disabled={submitting}
              style={{ background: accent }}
              className="w-full"
            >
              I&apos;m going
            </Button>
            <Button variant="secondary" onClick={() => rsvp("maybe")} disabled={submitting} className="w-full">
              Maybe
            </Button>
            <Button variant="secondary" onClick={() => rsvp("declined")} disabled={submitting} className="w-full">
              Can&apos;t make it
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center">This event has already passed.</p>
        )}

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Calendar size={16} className="text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">{formatDateTime(event.startsAt)}</p>
              {event.endsAt && (
                <p className="text-xs text-muted-foreground">Until {formatDateTime(event.endsAt)}</p>
              )}
            </div>
          </div>
          {event.location && (
            <div className="flex items-start gap-3">
              <MapPin size={16} className="text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">{event.location}</p>
                {event.address && <p className="text-xs text-muted-foreground">{event.address}</p>}
              </div>
            </div>
          )}
          {event.dressCode && (
            <p className="text-sm text-muted-foreground">Dress code: {event.dressCode}</p>
          )}
        </div>

        {event.description && (
          <div>
            <p className="text-sm font-semibold mb-1">About</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center pt-4 border-t border-border">
          Hosted by {org?.name ?? "your chapter"} via TouseOS
        </p>
      </div>
    </div>
  );
}
