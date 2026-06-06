"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Calendar, CheckSquare, DollarSign, FileText, MapPin, Send, Upload, Users,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Badge, Button, Card, CardHeader, EmptyState, Input, Modal, PageHeader,
  ProgressBar, Select, StatCard, Tabs,
} from "@/components/ui";
import { formatCurrency, formatDate, downloadCsv } from "@/lib/utils";
import { BUDGET_CATEGORIES, GREEK_TRIP_TYPES } from "@/lib/travel-config";
import { can } from "@/lib/permissions";
import { useOrg } from "@/hooks/use-org";

interface GreekTripDetailProps {
  tripId: string;
}

export function GreekTripDetail({ tripId }: GreekTripDetailProps) {
  const { orgId, role, userId } = useOrg();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [legOpen, setLegOpen] = useState(false);
  const [checklistLabel, setChecklistLabel] = useState("");
  const [rsvpFilter, setRsvpFilter] = useState("all");
  const [addMemberId, setAddMemberId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ category: "transportation", description: "", estCost: "" });
  const [legForm, setLegForm] = useState({
    day: "1", legType: "transportation", title: "", location: "", startTime: "", endTime: "", notes: "",
  });

  const canManage = can(role, "manage_travel") || can(role, "edit_roster");

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const res = await fetch(`/api/greek/travel/${tripId}?org_id=${encodeURIComponent(oid)}`);
    if (res.ok) setData(await res.json());
    else toast.error("Failed to load trip");
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
  const members = (data?.members ?? []) as Array<{ id: string; full_name: string; user_id?: string }>;

  const myMemberId = useMemo(() => {
    if (!userId) return null;
    return members.find((m) => m.user_id === userId)?.id ?? null;
  }, [members, userId]);

  const attending = rsvps.filter((r) => r.status === "attending").length;
  const totalBudget = budget.reduce((s, b) => s + Number(b.est_cost ?? 0), 0);
  const daysUntil = useMemo(() => {
    if (!trip?.start_date) return null;
    return Math.ceil((new Date(String(trip.start_date)).getTime() - Date.now()) / 86400000);
  }, [trip?.start_date]);

  const checklistDone = checklist.filter((c) => c.complete).length;
  const checklistPct = checklist.length ? Math.round((checklistDone / checklist.length) * 100) : 0;

  const filteredRsvps = rsvps.filter((r) => rsvpFilter === "all" || r.status === rsvpFilter);
  const rsvpMemberIds = new Set(rsvps.map((r) => (r.member as { id?: string })?.id));
  const availableMembers = members.filter((m) => !rsvpMemberIds.has(m.id));

  const legsByDay = useMemo(() => {
    const map = new Map<number, Array<Record<string, unknown>>>();
    for (const leg of legs) {
      const day = Number(leg.day ?? 1);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(leg);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [legs]);

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

  async function toggleChecklist(itemId: string) {
    if (!orgId) return;
    const res = await fetch(`/api/greek/travel/${tripId}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, action: "toggle", itemId }),
    });
    if (res.ok) load(orgId);
    else toast.error("Failed to update checklist");
  }

  async function addChecklistItem() {
    if (!orgId || !checklistLabel.trim()) return;
    const res = await fetch(`/api/greek/travel/${tripId}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, label: checklistLabel.trim() }),
    });
    if (res.ok) {
      setChecklistLabel("");
      load(orgId);
    } else toast.error("Failed to add item");
  }

  async function markAllChecklist() {
    if (!orgId) return;
    const res = await fetch(`/api/greek/travel/${tripId}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, action: "mark_all_complete" }),
    });
    if (res.ok) load(orgId);
    else toast.error("Failed to mark all complete");
  }

  async function inviteAll() {
    if (!orgId) return;
    const res = await fetch(`/api/greek/travel/${tripId}/roster`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, action: "invite_all" }),
    });
    const d = await res.json();
    if (res.ok) {
      toast.success(`Invited ${d.invited ?? 0} members`);
      load(orgId);
    } else toast.error("Failed to invite members");
  }

  async function addMember() {
    if (!orgId || !addMemberId) return;
    const res = await fetch(`/api/greek/travel/${tripId}/roster`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, action: "rsvp", memberId: addMemberId, status: "no_response" }),
    });
    if (res.ok) {
      setAddMemberId("");
      load(orgId);
    } else toast.error("Failed to add member");
  }

  async function updateRsvp(memberId: string, status: string, dietaryNotes?: string) {
    if (!orgId) return;
    const res = await fetch(`/api/greek/travel/${tripId}/roster`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, action: "rsvp", memberId, status, dietaryNotes }),
    });
    if (res.ok) load(orgId);
    else toast.error("Failed to update RSVP");
  }

  async function saveBudgetItem() {
    if (!orgId) return;
    const res = await fetch(`/api/greek/travel/${tripId}/budget`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        category: budgetForm.category,
        description: budgetForm.description,
        estCost: parseFloat(budgetForm.estCost) || 0,
      }),
    });
    if (res.ok) {
      toast.success("Budget item added");
      setBudgetOpen(false);
      setBudgetForm({ category: "transportation", description: "", estCost: "" });
      load(orgId);
    } else toast.error("Failed to add budget item");
  }

  async function addLeg() {
    if (!orgId || !legForm.title.trim()) return;
    const res = await fetch(`/api/greek/travel/${tripId}/itinerary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        day: parseInt(legForm.day, 10) || 1,
        legType: legForm.legType,
        title: legForm.title,
        location: legForm.location,
        startTime: legForm.startTime,
        endTime: legForm.endTime,
        notes: legForm.notes,
      }),
    });
    if (res.ok) {
      toast.success("Itinerary leg added");
      setLegOpen(false);
      setLegForm({ day: legForm.day, legType: "transportation", title: "", location: "", startTime: "", endTime: "", notes: "" });
      load(orgId);
    } else toast.error("Failed to add leg");
  }

  async function uploadDocument(file: File) {
    if (!orgId) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("org_id", orgId);
    const res = await fetch(`/api/greek/travel/${tripId}/documents`, { method: "POST", body: formData });
    setUploading(false);
    if (res.ok) {
      toast.success("Document uploaded");
      load(orgId);
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Upload failed");
    }
  }

  function exportRosterCsv() {
    downloadCsv("trip-roster.csv", rsvps.map((r) => {
      const m = r.member as { full_name?: string } | undefined;
      return { Name: m?.full_name ?? "", RSVP: String(r.status), Notes: String(r.dietary_notes ?? "") };
    }));
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
            action={
              canManage ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Button variant="secondary" size="sm" onClick={inviteAll}>Invite all</Button>
                  <Button variant="secondary" size="sm" onClick={exportRosterCsv}>Export CSV</Button>
                </div>
              ) : undefined
            }
          />
          {canManage && (
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <Select
                value={addMemberId}
                onChange={(e) => setAddMemberId(e.target.value)}
                options={availableMembers.map((m) => ({ value: m.id, label: m.full_name }))}
                placeholder="Add member"
              />
              <Button size="sm" disabled={!addMemberId} onClick={addMember}>Add</Button>
              <Select
                value={rsvpFilter}
                onChange={(e) => setRsvpFilter(e.target.value)}
                options={[
                  { value: "all", label: "All RSVPs" },
                  { value: "attending", label: "Attending" },
                  { value: "not_attending", label: "Not attending" },
                  { value: "no_response", label: "No response" },
                ]}
              />
            </div>
          )}
          {filteredRsvps.length === 0 ? (
            <EmptyState title="No RSVPs yet" description={canManage ? "Invite all members or add individuals." : "RSVP status will appear here."} />
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
                  {filteredRsvps.map((r) => {
                    const member = r.member as { id?: string; full_name?: string } | undefined;
                    const isSelf = member?.id === myMemberId;
                    return (
                      <tr key={String(r.id)}>
                        <td>{member?.full_name ?? "Member"}</td>
                        <td>
                          {(canManage || isSelf) ? (
                            <Select
                              value={String(r.status)}
                              onChange={(e) => updateRsvp(String(member?.id), e.target.value, String(r.dietary_notes ?? ""))}
                              options={[
                                { value: "attending", label: "Attending" },
                                { value: "not_attending", label: "Not attending" },
                                { value: "no_response", label: "No response" },
                              ]}
                            />
                          ) : (
                            <Badge label={String(r.status).replace("_", " ")} color="blue" />
                          )}
                        </td>
                        <td>
                          {(canManage || isSelf) ? (
                            <Input
                              defaultValue={String(r.dietary_notes ?? "")}
                              placeholder="Dietary / notes"
                              onBlur={(e) => updateRsvp(String(member?.id), String(r.status), e.target.value)}
                            />
                          ) : (
                            <span className="type-small">{String(r.dietary_notes || "—")}</span>
                          )}
                        </td>
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
          <CardHeader
            title="Day-by-day itinerary"
            icon={<Calendar size={16} />}
            action={canManage ? <Button size="sm" onClick={() => setLegOpen(true)}>Add leg</Button> : undefined}
          />
          {legsByDay.length === 0 ? (
            <EmptyState title="No itinerary legs" description="Add transportation, accommodation, and activity legs per day." />
          ) : (
            <div className="ds-page-stack" style={{ gap: 16 }}>
              {legsByDay.map(([day, dayLegs]) => (
                <div key={day}>
                  <p className="type-h3" style={{ margin: "0 0 8px" }}>Day {day}</p>
                  <div className="ds-page-stack" style={{ gap: 8 }}>
                    {dayLegs.map((leg) => {
                      const details = leg.details as Record<string, unknown> | undefined;
                      return (
                        <div key={String(leg.id)} className="ds-card" style={{ padding: 16 }}>
                          <p className="type-label" style={{ margin: "0 0 4px" }}>{String(leg.leg_type)}</p>
                          <p className="type-body" style={{ margin: 0, fontWeight: 500 }}>{String(details?.title ?? "")}</p>
                          {Boolean(details?.location) && <p className="type-small" style={{ margin: "4px 0 0" }}>{String(details?.location)}</p>}
                          {(Boolean(details?.startTime) || Boolean(details?.endTime)) && (
                            <p className="type-small" style={{ margin: "4px 0 0", color: "var(--color-text-muted)" }}>
                              {[details?.startTime, details?.endTime].filter(Boolean).join(" – ")}
                            </p>
                          )}
                          {Boolean(leg.confirmation_number) && (
                            <p className="type-small" style={{ margin: "4px 0 0", fontFamily: "var(--font-mono)" }}>
                              Conf: {String(leg.confirmation_number)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
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
          <CardHeader
            title="Trip documents"
            icon={<FileText size={16} />}
            action={
              canManage ? (
                <>
                  <input ref={fileRef} type="file" accept=".pdf,.docx,.png,.jpg,.jpeg" hidden onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadDocument(f);
                    e.target.value = "";
                  }} />
                  <Button size="sm" icon={<Upload size={14} />} loading={uploading} onClick={() => fileRef.current?.click()}>
                    Upload
                  </Button>
                </>
              ) : undefined
            }
          />
          {documents.length === 0 ? (
            <EmptyState title="No documents" description="Upload PDF, DOCX, PNG, or JPG files." />
          ) : (
            <ul className="ds-page-stack" style={{ gap: 8, listStyle: "none", padding: 0, margin: 0 }}>
              {documents.map((d) => (
                <li key={String(d.id)} className="ds-card" style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="type-body">{String(d.filename)}</span>
                  <a href={String(d.url)} target="_blank" rel="noopener noreferrer" className="type-small" style={{ color: "var(--color-org-primary)" }}>Download</a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "checklist" && (
        <Card>
          <CardHeader
            title="Pre-trip checklist"
            icon={<CheckSquare size={16} />}
            action={canManage && checklist.length > 0 ? (
              <Button variant="secondary" size="sm" onClick={markAllChecklist}>Mark all complete</Button>
            ) : undefined}
          />
          <ProgressBar value={checklistPct} label={`${checklistPct}% complete`} />
          <div className="ds-page-stack" style={{ gap: 8, marginTop: 16 }}>
            {checklist.map((item) => (
              <label key={String(item.id)} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44 }}>
                <input
                  type="checkbox"
                  checked={Boolean(item.complete)}
                  disabled={!canManage}
                  onChange={() => canManage && toggleChecklist(String(item.id))}
                />
                <span className="type-body" style={{ textDecoration: item.complete ? "line-through" : undefined }}>
                  {String(item.label)}
                </span>
              </label>
            ))}
          </div>
          {canManage && (
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <Input value={checklistLabel} onChange={(e) => setChecklistLabel(e.target.value)} placeholder="Add checklist item" />
              <Button size="sm" disabled={!checklistLabel.trim()} onClick={addChecklistItem}>Add</Button>
            </div>
          )}
        </Card>
      )}

      <Modal open={budgetOpen} onClose={() => setBudgetOpen(false)} title="Add budget line item"
        footer={
          <>
            <Button variant="secondary" onClick={() => setBudgetOpen(false)}>Cancel</Button>
            <Button onClick={saveBudgetItem}>Save</Button>
          </>
        }
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

      <Modal open={legOpen} onClose={() => setLegOpen(false)} title="Add itinerary leg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setLegOpen(false)}>Cancel</Button>
            <Button onClick={addLeg} disabled={!legForm.title.trim()}>Add leg</Button>
          </>
        }
      >
        <div className="ds-page-stack" style={{ gap: 12 }}>
          <Input label="Day" type="number" value={legForm.day} onChange={(e) => setLegForm({ ...legForm, day: e.target.value })} />
          <Select
            label="Leg type"
            value={legForm.legType}
            onChange={(e) => setLegForm({ ...legForm, legType: e.target.value })}
            options={[
              { value: "transportation", label: "Transportation" },
              { value: "accommodation", label: "Accommodation" },
              { value: "activity", label: "Activity" },
            ]}
          />
          <Input label="Title *" value={legForm.title} onChange={(e) => setLegForm({ ...legForm, title: e.target.value })} />
          <Input label="Location" value={legForm.location} onChange={(e) => setLegForm({ ...legForm, location: e.target.value })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Start time" value={legForm.startTime} onChange={(e) => setLegForm({ ...legForm, startTime: e.target.value })} placeholder="8:00 AM" />
            <Input label="End time" value={legForm.endTime} onChange={(e) => setLegForm({ ...legForm, endTime: e.target.value })} placeholder="10:00 AM" />
          </div>
          <Input label="Notes" value={legForm.notes} onChange={(e) => setLegForm({ ...legForm, notes: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
