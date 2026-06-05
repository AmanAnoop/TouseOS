"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Calendar, CheckSquare, DollarSign, FileText, MapPin, Send, Users,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Badge, Button, Card, CardHeader, EmptyState, Input, Modal, PageHeader,
  ProgressBar, Select, StatCard, Tabs,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BUDGET_CATEGORIES, GREEK_TRIP_TYPES } from "@/lib/travel-config";
import { can } from "@/lib/permissions";
import { useOrg } from "@/hooks/use-org";

interface GreekTripDetailProps {
  tripId: string;
}

export function GreekTripDetail({ tripId }: GreekTripDetailProps) {
  const { orgId, role } = useOrg();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [checklistLabel, setChecklistLabel] = useState("");
  const [budgetForm, setBudgetForm] = useState({ category: "transportation", description: "", estCost: "" });

  const canManage = can(role, "manage_travel") || can(role, "edit_roster");

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const res = await fetch(`/api/greek/travel/${tripId}?org_id=${encodeURIComponent(oid)}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [tripId]);

  useEffect(() => {
    if (orgId) load(orgId);
  }, [orgId, load]);

  const trip = data?.trip as Record<string, unknown> | undefined;
  const rsvps = (data?.rsvps ?? []) as Array<Record<string, unknown>>;
  const checklist = (data?.checklist ?? []) as Array<Record<string, unknown>>;
  const budget = (data?.budget ?? []) as Array<Record<string, unknown>>;
  const documents = (data?.documents ?? []) as Array<Record<string, unknown>>;
  const legs = (data?.legs ?? []) as Array<Record<string, unknown>>;

  const attending = rsvps.filter((r) => r.status === "attending").length;
  const totalBudget = budget.reduce((s, b) => s + Number(b.est_cost ?? 0), 0);
  const daysUntil = useMemo(() => {
    if (!trip?.start_date) return null;
    const diff = Math.ceil((new Date(String(trip.start_date)).getTime() - Date.now()) / 86400000);
    return diff;
  }, [trip?.start_date]);

  const checklistDone = checklist.filter((c) => c.complete).length;
  const checklistPct = checklist.length ? Math.round((checklistDone / checklist.length) * 100) : 0;

  async function shareAnnouncement() {
    if (!orgId || !trip) return;
    const res = await fetch("/api/comms/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        title: `Trip: ${trip.name}`,
        body: `${trip.name} — ${trip.destination || "TBD"}\n${formatDate(String(trip.start_date))} – ${formatDate(String(trip.end_date))}\n\nRSVP in Travel → ${trip.name}`,
        audience: trip.visibility === "exec_only" ? ["officers"] : ["all"],
      }),
    });
    if (res.ok) toast.success("Announcement posted with RSVP link");
    else toast.error("Failed to post announcement");
  }

  if (loading) {
    return <div className="ds-page-skeleton"><div className="ds-page-skeleton-header" /></div>;
  }

  if (!trip) {
    return <EmptyState title="Trip not found" action={<Link href="/travel">Back to travel</Link>} />;
  }

  const typeLabel = GREEK_TRIP_TYPES.find((t) => t.value === trip.type)?.label ?? String(trip.type);

  return (
    <div className="ds-page-stack">
      <Link href="/travel" className="type-small" style={{ color: "var(--color-org-primary)", display: "inline-flex", alignItems: "center", gap: 4 }}>
        <ArrowLeft size={14} /> All trips
      </Link>

      <PageHeader
        title={String(trip.name)}
        description={[trip.destination, formatDate(String(trip.start_date)), formatDate(String(trip.end_date))].filter(Boolean).join(" · ")}
        action={
          canManage ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button variant="secondary" size="sm" icon={<Send size={14} />} onClick={shareAnnouncement}>
                Share with chapter
              </Button>
              <Select
                value={String(trip.status)}
                onChange={async (e) => {
                  await fetch(`/api/greek/travel/${tripId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ orgId, status: e.target.value }),
                  });
                  if (orgId) load(orgId);
                }}
                options={[
                  { value: "planning", label: "Planning" },
                  { value: "confirmed", label: "Confirmed" },
                  { value: "in_progress", label: "In progress" },
                  { value: "completed", label: "Completed" },
                ]}
              />
            </div>
          ) : undefined
        }
      />

      <Tabs
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "roster", label: "Roster" },
          { id: "itinerary", label: "Itinerary" },
          { id: "budget", label: "Budget" },
          { id: "documents", label: "Documents" },
          { id: "checklist", label: "Checklist" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "overview" && (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge label={typeLabel} color="blue" />
            <Badge label={String(trip.status)} color="gray" />
          </div>
          <div className="ds-stat-grid">
            <StatCard title="Attending" value={attending} icon={<Users size={18} />} />
            <StatCard title="Total budget" value={formatCurrency(totalBudget)} icon={<DollarSign size={18} />} />
            <StatCard title="Collected" value={formatCurrency(Number(trip.amount_collected ?? 0))} icon={<DollarSign size={18} />} />
            <StatCard title="Days until trip" value={daysUntil != null ? Math.max(0, daysUntil) : "—"} icon={<Calendar size={18} />} />
          </div>
          <Card>
            <CardHeader title="Trip details" icon={<MapPin size={16} />} />
            <p className="type-body" style={{ margin: 0 }}>
              <strong>Destination:</strong> {String(trip.destination || "TBD")}<br />
              <strong>Departure:</strong> {String(trip.departure_location || "TBD")}<br />
              <strong>Estimated attendees:</strong> {String(trip.estimated_attendees ?? 0)}
            </p>
          </Card>
        </>
      )}

      {tab === "roster" && (
        <Card>
          <CardHeader
            title="RSVP roster"
            icon={<Users size={16} />}
            action={canManage && orgId ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  await fetch(`/api/greek/travel/${tripId}/roster`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ orgId, action: "invite_all" }),
                  });
                  toast.success("All members invited");
                  load(orgId);
                }}
              >
                Invite all members
              </Button>
            ) : undefined}
          />
          {rsvps.length === 0 ? (
            <EmptyState title="No RSVPs yet" description="Use Invite all members to add the chapter roster." />
          ) : (
            <div className="ds-table-wrap">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>RSVP</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {rsvps.map((r) => {
                    const member = r.member as { full_name?: string } | undefined;
                    return (
                      <tr key={String(r.id)}>
                        <td>{member?.full_name ?? "Member"}</td>
                        <td><Badge label={String(r.status).replace("_", " ")} color="blue" /></td>
                        <td className="type-small">{String(r.dietary_notes || "—")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "itinerary" && (
        <Card>
          <CardHeader title="Day-by-day itinerary" icon={<Calendar size={16} />} />
          {legs.length === 0 ? (
            <EmptyState title="No itinerary legs" description="Add transportation, accommodation, and activity legs per day." />
          ) : (
            <div className="ds-page-stack" style={{ gap: 12 }}>
              {legs.map((leg) => (
                <div key={String(leg.id)} className="ds-card" style={{ padding: 16 }}>
                  <p className="type-label" style={{ margin: "0 0 4px" }}>Day {String(leg.day)} · {String(leg.leg_type)}</p>
                  <p className="type-body" style={{ margin: 0 }}>{JSON.stringify(leg.details)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === "budget" && (
        <>
          <div className="ds-stat-grid">
            <StatCard title="Total budget" value={formatCurrency(totalBudget)} icon={<DollarSign size={18} />} />
            <StatCard title="Collected" value={formatCurrency(Number(trip.amount_collected ?? 0))} icon={<DollarSign size={18} />} />
            <StatCard title="Remaining" value={formatCurrency(totalBudget - Number(trip.amount_collected ?? 0))} icon={<DollarSign size={18} />} />
          </div>
          <Card>
            <CardHeader
              title="Line items"
              icon={<DollarSign size={16} />}
              action={canManage ? <Button size="sm" onClick={() => setBudgetOpen(true)}>Add line item</Button> : undefined}
            />
            {budget.length === 0 ? (
              <EmptyState title="No budget items" />
            ) : (
              <div className="ds-table-wrap">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Description</th>
                      <th className="ds-table-num">Est.</th>
                      <th className="ds-table-num">Actual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budget.map((b) => (
                      <tr key={String(b.id)}>
                        <td>{String(b.category)}</td>
                        <td>{String(b.description || "—")}</td>
                        <td className="ds-table-num">{formatCurrency(Number(b.est_cost ?? 0))}</td>
                        <td className="ds-table-num">{formatCurrency(Number(b.actual_cost ?? 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {tab === "documents" && (
        <Card>
          <CardHeader title="Trip documents" icon={<FileText size={16} />} />
          {documents.length === 0 ? (
            <EmptyState title="No documents" description="Upload PDF, DOCX, PNG, or JPG files." />
          ) : (
            <ul className="ds-page-stack" style={{ gap: 8, listStyle: "none", padding: 0, margin: 0 }}>
              {documents.map((d) => (
                <li key={String(d.id)} className="ds-card" style={{ padding: 12, display: "flex", justifyContent: "space-between" }}>
                  <span>{String(d.filename)}</span>
                  <a href={String(d.url)} className="type-small" style={{ color: "var(--color-org-primary)" }}>Download</a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "checklist" && (
        <Card>
          <CardHeader title="Pre-trip checklist" icon={<CheckSquare size={16} />} />
          <ProgressBar value={checklistPct} label={`${checklistPct}% complete`} />
          <div className="ds-page-stack" style={{ gap: 8, marginTop: 16 }}>
            {checklist.map((item) => (
              <label key={String(item.id)} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44 }}>
                <input
                  type="checkbox"
                  checked={Boolean(item.complete)}
                  disabled={!canManage}
                  onChange={async () => {
                    if (!orgId) return;
                    await fetch(`/api/greek/travel/${tripId}/checklist`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ orgId, action: "toggle", itemId: item.id }),
                    });
                    load(orgId);
                  }}
                />
                <span className="type-body">{String(item.label)}</span>
              </label>
            ))}
          </div>
          {canManage && (
            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              <Input value={checklistLabel} onChange={(e) => setChecklistLabel(e.target.value)} placeholder="Add checklist item" />
              <Button
                size="sm"
                disabled={!checklistLabel.trim() || !orgId}
                onClick={async () => {
                  if (!orgId) return;
                  await fetch(`/api/greek/travel/${tripId}/checklist`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ orgId, label: checklistLabel.trim() }),
                  });
                  setChecklistLabel("");
                  load(orgId);
                }}
              >
                Add
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  if (!orgId) return;
                  await fetch(`/api/greek/travel/${tripId}/checklist`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ orgId, action: "mark_all_complete" }),
                  });
                  load(orgId);
                }}
              >
                Mark all complete
              </Button>
            </div>
          )}
        </Card>
      )}

      <Modal open={budgetOpen} onClose={() => setBudgetOpen(false)} title="Add budget line item"
        footer={<Button variant="secondary" onClick={() => setBudgetOpen(false)}>Close</Button>}
      >
        <div className="ds-page-stack" style={{ gap: 12 }}>
          <Select
            label="Category"
            value={budgetForm.category}
            onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })}
            options={BUDGET_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
          />
          <Input label="Description" value={budgetForm.description} onChange={(e) => setBudgetForm({ ...budgetForm, description: e.target.value })} />
          <Input label="Estimated cost" type="number" value={budgetForm.estCost} onChange={(e) => setBudgetForm({ ...budgetForm, estCost: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
