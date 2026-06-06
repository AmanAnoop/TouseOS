"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Copy, Link2 } from "lucide-react";
import { Button, Card, EmptyState, Modal } from "@/components/ui";
import type { PnmLead } from "@/types";
import type { PnmRsvpStatus } from "@/lib/pnm-invite";

interface PnmEvent {
  id: string;
  title: string;
  starts_at: string;
  invite_only?: boolean;
}

interface PnmInviteRow {
  pnmId: string;
  inviteToken: string | null;
  inviteUrl: string | null;
  rsvpStatus: PnmRsvpStatus;
  rsvpAt: string | null;
  checkedIn: boolean;
}

interface PnmEventsTabProps {
  orgId: string;
  pnms: PnmLead[];
}

function rsvpLabel(status: PnmRsvpStatus): string {
  switch (status) {
    case "going": return "Going";
    case "maybe": return "Maybe";
    case "declined": return "Declined";
    default: return "Pending";
  }
}

export function PnmEventsTab({ orgId, pnms }: PnmEventsTabProps) {
  const [events, setEvents] = useState<PnmEvent[]>([]);
  const [manageEventId, setManageEventId] = useState<string | null>(null);
  const [selectedPnmIds, setSelectedPnmIds] = useState<string[]>([]);
  const [invites, setInvites] = useState<PnmInviteRow[]>([]);
  const [notifySms, setNotifySms] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/events?org_id=${encodeURIComponent(orgId)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((all: Array<PnmEvent & { type?: string }>) => {
        const now = new Date().toISOString();
        setEvents(
          all
            .filter((e) => new Date(e.starts_at) >= new Date(now))
            .slice(0, 20),
        );
      })
      .finally(() => setLoading(false));
  }, [orgId]);

  async function openManage(eventId: string) {
    setManageEventId(eventId);
    const res = await fetch(
      `/api/events/invites?org_id=${encodeURIComponent(orgId)}&event_id=${encodeURIComponent(eventId)}`,
    );
    if (res.ok) {
      const data = await res.json();
      setSelectedPnmIds((data.pnmIds ?? []) as string[]);
      setInvites((data.invites ?? []) as PnmInviteRow[]);
    } else {
      setSelectedPnmIds([]);
      setInvites([]);
    }
  }

  async function saveInvites() {
    if (!manageEventId) return;
    const res = await fetch("/api/events/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        eventId: manageEventId,
        pnmIds: selectedPnmIds,
        notifySms,
      }),
    });
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Failed to update invites");
      return;
    }
    const json = await res.json();
    const parts = ["Invites updated"];
    if (json.added > 0 && json.smsSent > 0) parts.push(`${json.smsSent} SMS sent`);
    toast.success(parts.join(" · "));
    setManageEventId(null);
    setNotifySms(false);
  }

  function copyLink(url: string) {
    navigator.clipboard.writeText(url).then(
      () => toast.success("Invite link copied"),
      () => toast.error("Could not copy link"),
    );
  }

  const goingCount = invites.filter((i) => i.rsvpStatus === "going").length;
  const pendingCount = invites.filter((i) => i.rsvpStatus === "pending").length;

  if (loading) {
    return <div className="h-32 rounded-lg bg-surface-2 animate-pulse" />;
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <Link href="/events/new?invite_only=1&audience=pnm">
          <Button size="sm">Create invite-only event</Button>
        </Link>
      </div>
      {events.length === 0 ? (
        <EmptyState title="No upcoming events" description="Create an invite-only recruitment event to manage PNM invites." />
      ) : (
        <div className="ds-page-stack" style={{ gap: 12 }}>
          {events.map((e) => (
            <Card key={e.id} padding="sm">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <p style={{ fontWeight: 500 }}>{e.title}</p>
                  <p className="type-small" style={{ color: "var(--color-text-secondary)" }}>
                    {new Date(e.starts_at).toLocaleString()}
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => openManage(e.id)}>
                  Manage invites
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(manageEventId)}
        onClose={() => { setManageEventId(null); setNotifySms(false); }}
        title="Manage PNM invites"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setManageEventId(null)}>Cancel</Button>
            <Button onClick={saveInvites}>Update invites</Button>
          </>
        }
      >
        <div className="grid md:grid-cols-2 gap-4" style={{ minHeight: 280 }}>
          <div>
            <p className="type-label" style={{ marginBottom: 8 }}>
              Invited PNMs {invites.length > 0 && `(${goingCount} going · ${pendingCount} pending)`}
            </p>
            <div className="ds-page-stack" style={{ gap: 8, maxHeight: 240, overflowY: "auto" }}>
              {selectedPnmIds.length === 0 ? (
                <p className="type-small" style={{ color: "var(--color-text-tertiary)" }}>None selected</p>
              ) : (
                selectedPnmIds.map((id) => {
                  const p = pnms.find((x) => x.id === id);
                  const inv = invites.find((x) => x.pnmId === id);
                  return (
                    <div key={id} className="flex items-center justify-between gap-2 type-small">
                      <div>
                        <p>{p?.full_name ?? id}</p>
                        <p style={{ color: "var(--color-text-tertiary)" }}>
                          {rsvpLabel(inv?.rsvpStatus ?? "pending")}
                          {inv?.checkedIn ? " · checked in" : ""}
                        </p>
                      </div>
                      {inv?.inviteUrl && (
                        <button
                          type="button"
                          onClick={() => copyLink(inv.inviteUrl!)}
                          className="text-muted-foreground hover:text-foreground p-1"
                          title="Copy RSVP link"
                        >
                          <Copy size={14} />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div>
            <p className="type-label" style={{ marginBottom: 8 }}>All PNMs</p>
            <div className="ds-page-stack" style={{ gap: 4, maxHeight: 200, overflowY: "auto" }}>
              {pnms.map((p) => (
                <label key={p.id} className="type-small" style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 36 }}>
                  <input
                    type="checkbox"
                    checked={selectedPnmIds.includes(p.id)}
                    onChange={() => {
                      setSelectedPnmIds((prev) =>
                        prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id],
                      );
                    }}
                  />
                  {p.full_name}
                </label>
              ))}
            </div>
            <label className="type-small flex items-center gap-2 mt-4" style={{ minHeight: 36 }}>
              <input
                type="checkbox"
                checked={notifySms}
                onChange={(e) => setNotifySms(e.target.checked)}
              />
              <span className="flex items-center gap-1">
                <Link2 size={13} />
                Text RSVP link to newly invited PNMs (opted-in only)
              </span>
            </label>
          </div>
        </div>
      </Modal>
    </>
  );
}
