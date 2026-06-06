"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button, Card, EmptyState, Modal } from "@/components/ui";
import type { PnmLead } from "@/types";

interface PnmEvent {
  id: string;
  title: string;
  starts_at: string;
  invite_only?: boolean;
}

interface PnmEventsTabProps {
  orgId: string;
  pnms: PnmLead[];
}

export function PnmEventsTab({ orgId, pnms }: PnmEventsTabProps) {
  const [events, setEvents] = useState<PnmEvent[]>([]);
  const [manageEventId, setManageEventId] = useState<string | null>(null);
  const [selectedPnmIds, setSelectedPnmIds] = useState<string[]>([]);
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
    } else {
      setSelectedPnmIds([]);
    }
  }

  async function saveInvites() {
    if (!manageEventId) return;
    const res = await fetch("/api/events/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, eventId: manageEventId, pnmIds: selectedPnmIds }),
    });
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Failed to update invites");
      return;
    }
    toast.success("Invites updated");
    setManageEventId(null);
  }

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
        onClose={() => setManageEventId(null)}
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
            <p className="type-label" style={{ marginBottom: 8 }}>Current invites</p>
            <div className="ds-page-stack" style={{ gap: 8 }}>
              {selectedPnmIds.length === 0 ? (
                <p className="type-small" style={{ color: "var(--color-text-tertiary)" }}>None selected</p>
              ) : (
                selectedPnmIds.map((id) => {
                  const p = pnms.find((x) => x.id === id);
                  return <p key={id} className="type-small">{p?.full_name ?? id}</p>;
                })
              )}
            </div>
          </div>
          <div>
            <p className="type-label" style={{ marginBottom: 8 }}>All PNMs</p>
            <div className="ds-page-stack" style={{ gap: 4, maxHeight: 240, overflowY: "auto" }}>
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
          </div>
        </div>
      </Modal>
    </>
  );
}
