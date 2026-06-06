"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, CheckCircle2, Plus, Shield, Users } from "lucide-react";
import toast from "react-hot-toast";
import { usePermissions } from "@/hooks/use-permissions";
import { useOrg } from "@/hooks/use-org";
import {
  Alert, Badge, Button, Card, CardHeader, Input,
  EmptyState, Modal, PageHeader, ProgressBar, StatCard,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";
import {
  computeRiskScore,
  RISK_CHECKLIST_ITEMS,
  requiredSoberMonitors,
  riskLabel,
  SOBER_MONITOR_GUEST_RATIO,
  type RiskChecklistMetadata,
} from "@/lib/risk-config";
import type { MemberProfile } from "@/types";

interface RiskChecklist {
  id: string;
  org_id: string;
  event_id: string | null;
  alcohol_policy: boolean;
  sober_monitors_assigned: boolean;
  guest_ratio_checked: boolean;
  venue_contract_uploaded: boolean;
  transportation_plan: boolean;
  security_plan: boolean;
  emergency_plan: boolean;
  food_water_plan: boolean;
  risk_score: number | null;
  approved: boolean;
  notes: string | null;
  metadata?: RiskChecklistMetadata;
  created_at: string;
}

function checklistItemsFromRecord(c: RiskChecklist): Record<string, boolean> {
  return Object.fromEntries(
    RISK_CHECKLIST_ITEMS.map((item) => [item.key, Boolean(c[item.key as keyof RiskChecklist])]),
  );
}

export default function RiskPage() {
  const { can, loading: permLoading } = usePermissions();
  const [checklists, setChecklists] = useState<RiskChecklist[]>([]);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { orgId } = useOrg();
  const [createOpen, setCreateOpen] = useState(false);
  const [events, setEvents] = useState<Array<{ id: string; title: string; starts_at: string }>>([]);

  const [newChecklist, setNewChecklist] = useState<Record<string, boolean>>(
    Object.fromEntries(RISK_CHECKLIST_ITEMS.map((i) => [i.key, false])),
  );
  const [selectedEventId, setSelectedEventId] = useState("");
  const [notes, setNotes] = useState("");
  const [expectedAttendees, setExpectedAttendees] = useState("");
  const [soberMonitorIds, setSoberMonitorIds] = useState<string[]>([]);

  const [incidents, setIncidents] = useState<Array<Record<string, unknown>>>([]);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [incidentForm, setIncidentForm] = useState({
    description: "",
    severity: "medium",
    isAnonymous: false,
    reportType: "general",
    involvedParties: "",
  });

  const attendeeCount = parseInt(expectedAttendees, 10) || 0;
  const monitorsRequired = requiredSoberMonitors(attendeeCount);
  const monitorsMet = soberMonitorIds.length >= monitorsRequired;

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const [ckRes, evRes, incRes, memRes] = await Promise.all([
      fetch(`/api/risk/checklists?org_id=${encodeURIComponent(oid)}`),
      fetch(`/api/events?org_id=${encodeURIComponent(oid)}`).then(async (r) => {
        if (!r.ok) return { data: [] };
        const all = (await r.json()) as Array<{ id: string; title: string; starts_at: string }>;
        const now = new Date().toISOString();
        return {
          data: all
            .filter((e) => new Date(e.starts_at) >= new Date(now))
            .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
            .slice(0, 20),
        };
      }),
      fetch(`/api/incidents?org_id=${oid}`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/members?org_id=${encodeURIComponent(oid)}`),
    ]);
    setChecklists(ckRes.ok ? ((await ckRes.json()) as RiskChecklist[]) : []);
    setEvents((evRes.data ?? []) as Array<{ id: string; title: string; starts_at: string }>);
    setIncidents(Array.isArray(incRes) ? incRes : []);
    if (memRes.ok) setMembers((await memRes.json()) as MemberProfile[]);
    setLoading(false);
  }, []);

  function exportIncidents() {
    if (!orgId) return;
    window.open(`/api/incidents/export?org_id=${encodeURIComponent(orgId)}`, "_blank");
    toast.success("Downloading incident report CSV");
  }

  async function fileIncident() {
    if (!orgId || !incidentForm.description.trim()) return;
    const res = await fetch("/api/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        description: incidentForm.description,
        severity: incidentForm.severity,
        isAnonymous: incidentForm.isAnonymous,
        reportType: incidentForm.reportType,
        involvedParties: incidentForm.involvedParties || null,
      }),
    });
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Failed to file report");
      return;
    }
    toast.success("Incident report filed");
    setIncidentOpen(false);
    setIncidentForm({ description: "", severity: "medium", isAnonymous: false, reportType: "general", involvedParties: "" });
    load(orgId);
  }

  useEffect(() => {
    if (orgId) load(orgId);
  }, [orgId, load]);

  function toggleSoberMonitor(memberId: string) {
    setSoberMonitorIds((prev) => {
      const next = prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId];
      const met = next.length >= monitorsRequired;
      setNewChecklist((c) => ({ ...c, sober_monitors_assigned: met }));
      return next;
    });
  }

  async function createChecklist() {
    if (!orgId) return;
    const items = {
      ...newChecklist,
      sober_monitors_assigned: monitorsMet || newChecklist.sober_monitors_assigned,
    };
    const score = computeRiskScore(items);
    const res = await fetch("/api/risk/checklists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        eventId: selectedEventId || null,
        items,
        riskScore: score,
        notes,
        metadata: {
          expected_attendees: attendeeCount || undefined,
          sober_monitor_ids: soberMonitorIds,
        },
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Failed to save");
      return;
    }
    toast.success("Risk checklist saved");
    setCreateOpen(false);
    setNewChecklist(Object.fromEntries(RISK_CHECKLIST_ITEMS.map((i) => [i.key, false])));
    setNotes("");
    setSelectedEventId("");
    setExpectedAttendees("");
    setSoberMonitorIds([]);
    load(orgId);
  }

  async function toggleChecklistItem(checklist: RiskChecklist, key: string, checked: boolean) {
    if (!orgId || !can("manage_incidents")) return;
    const items = { ...checklistItemsFromRecord(checklist), [key]: checked };
    const score = computeRiskScore(items);
    const res = await fetch("/api/risk/checklists", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: checklist.id, orgId, items, riskScore: score }),
    });
    if (!res.ok) {
      toast.error("Failed to update");
      return;
    }
    const updated = await res.json() as RiskChecklist;
    setChecklists((prev) => prev.map((c) => (c.id === checklist.id ? updated : c)));
  }

  async function approveChecklist(id: string) {
    if (!orgId) return;
    const res = await fetch("/api/risk/checklists", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, orgId, approved: true }),
    });
    if (!res.ok) {
      toast.error("Failed to approve");
      return;
    }
    setChecklists((prev) => prev.map((c) => (c.id === id ? { ...c, approved: true } : c)));
    toast.success("Checklist approved");
  }

  const approved = checklists.filter((c) => c.approved).length;
  const pending = checklists.filter((c) => !c.approved).length;
  const formScore = computeRiskScore(newChecklist);
  const formRisk = riskLabel(formScore);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Risk Management"
        description="Event risk checklists, sober monitor assignments, and incident reports"
        action={
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)} disabled={permLoading || !can("manage_incidents")}>
            New risk checklist
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total checklists" value={checklists.length} icon={<Shield size={18} />} />
        <StatCard title="Approved" value={approved} deltaType="up" icon={<CheckCircle2 size={18} />} />
        <StatCard title="Pending approval" value={pending} deltaType={pending > 0 ? "down" : "neutral"} icon={<AlertTriangle size={18} />} />
        <StatCard title="High risk events" value={checklists.filter((c) => (c.risk_score ?? 0) < 60).length} icon={<AlertTriangle size={18} />} />
      </div>

      {pending > 0 && (
        <Alert type="warning" title={`${pending} risk checklist${pending > 1 ? "s" : ""} pending approval`} description="Review and approve before the event." />
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Card key={i} className="h-24 animate-pulse bg-surface-2 border-0">&nbsp;</Card>)}</div>
      ) : checklists.length === 0 ? (
        <EmptyState
          icon={<Shield size={24} />}
          title="No risk checklists"
          description="Create a risk checklist before your next social event."
          action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)} disabled={permLoading || !can("manage_incidents")}>Create checklist</Button>}
        />
      ) : (
        <div className="space-y-3">
          {checklists.map((c) => {
            const score = c.risk_score ?? 0;
            const { label, color } = riskLabel(score);
            const meta = c.metadata ?? {};
            const monitorIds = meta.sober_monitor_ids ?? [];
            const items = RISK_CHECKLIST_ITEMS.map((item) => ({
              ...item,
              checked: Boolean(c[item.key as keyof RiskChecklist]),
            }));
            return (
              <Card key={c.id}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-sm text-foreground">Risk checklist · {formatDate(c.created_at)}</p>
                    {meta.expected_attendees ? (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ~{meta.expected_attendees} attendees · {monitorIds.length} sober monitor{monitorIds.length !== 1 ? "s" : ""} assigned
                      </p>
                    ) : null}
                    {c.notes && <p className="text-xs text-muted-foreground mt-0.5">{c.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge label={label} color={color} />
                    {c.approved
                      ? <Badge label="Approved" color="green" dot />
                      : <Button size="sm" variant="secondary" onClick={() => approveChecklist(c.id)}>Approve</Button>
                    }
                  </div>
                </div>
                <ProgressBar value={score} color={color} size="md" label={`${score}% complete`} />
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {items.map((item) => (
                    <label key={item.key} className="flex items-start gap-2 text-xs cursor-pointer p-1.5 rounded hover:bg-surface-1">
                      <input
                        type="checkbox"
                        className="mt-0.5 rounded"
                        checked={item.checked}
                        disabled={!can("manage_incidents")}
                        onChange={(e) => toggleChecklistItem(c, item.key, e.target.checked)}
                      />
                      <span className={item.checked ? "text-muted-foreground line-through" : "text-foreground"}>
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
                {monitorIds.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                      <Users size={12} /> Sober monitors
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {monitorIds.map((id) => {
                        const m = members.find((mem) => mem.id === id);
                        return (
                          <Badge key={id} label={m?.full_name ?? "Member"} color="blue" />
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader
          title="Incident reports"
          description="File and track risk incidents"
          icon={<AlertTriangle size={16} />}
          action={
            <div className="flex flex-wrap gap-2">
              {incidents.length > 0 && can("manage_incidents") && (
                <Button size="sm" variant="secondary" onClick={exportIncidents}>
                  Export CSV
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => setIncidentOpen(true)}>
                File report
              </Button>
            </div>
          }
        />
        {incidents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No incidents filed yet.</p>
        ) : (
          <div className="space-y-2">
            {incidents.slice(0, 8).map((inc) => (
              <div key={String(inc.id)} className="p-3 border border-border rounded-lg">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge label={String(inc.severity)} color={inc.severity === "critical" ? "red" : inc.severity === "high" ? "orange" : "yellow"} />
                  <Badge label={String(inc.status)} color="gray" />
                  {Boolean(inc.is_anonymous) && <Badge label="Anonymous" color="blue" />}
                </div>
                <p className="text-sm line-clamp-2">{String(inc.description)}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatDate(String(inc.created_at))}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={incidentOpen}
        onClose={() => setIncidentOpen(false)}
        title="File incident report"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIncidentOpen(false)}>Cancel</Button>
            <Button onClick={fileIncident}>Submit report</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Report type</label>
            <select
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
              value={incidentForm.reportType}
              onChange={(e) => setIncidentForm({ ...incidentForm, reportType: e.target.value })}
            >
              <option value="general">General incident</option>
              <option value="anonymous">Anonymous report</option>
              <option value="standards_referral">Standards referral</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={incidentForm.isAnonymous || incidentForm.reportType === "anonymous"}
              onChange={(e) => setIncidentForm({ ...incidentForm, isAnonymous: e.target.checked })}
              disabled={incidentForm.reportType === "anonymous"}
            />
            <span className="text-sm">Submit anonymously</span>
          </label>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Severity</label>
            <select
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
              value={incidentForm.severity}
              onChange={(e) => setIncidentForm({ ...incidentForm, severity: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Description *</label>
            <textarea
              className="min-h-[100px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
              value={incidentForm.description}
              onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
              placeholder="Describe what happened..."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Involved parties (optional)</label>
            <textarea
              className="min-h-[60px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
              value={incidentForm.involvedParties}
              onChange={(e) => setIncidentForm({ ...incidentForm, involvedParties: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New risk checklist"
        description="Complete before any social event with alcohol or large guest lists."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createChecklist} icon={<Shield size={14} />}>Save checklist</Button>
          </>
        }
      >
        <div className="space-y-4">
          {events.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Link to event (optional)</label>
              <select className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
                <option value="">No specific event</option>
                {events.map((e) => <option key={e.id} value={e.id}>{e.title} · {formatDate(e.starts_at)}</option>)}
              </select>
            </div>
          )}

          <Input
            label="Expected attendees"
            type="number"
            min={0}
            placeholder="e.g. 75"
            value={expectedAttendees}
            onChange={(e) => setExpectedAttendees(e.target.value)}
            hint={`Requires ${monitorsRequired} sober monitor${monitorsRequired !== 1 ? "s" : ""} (1 per ${SOBER_MONITOR_GUEST_RATIO} guests, min. 2)`}
          />

          <Card className="p-3 bg-surface-1 border-border">
            <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <Users size={14} />
              Assign sober monitors ({soberMonitorIds.length}/{monitorsRequired})
            </p>
            {!monitorsMet && attendeeCount > 0 && (
              <p className="text-xs text-orange-600 mb-2">
                Select {monitorsRequired - soberMonitorIds.length} more monitor{monitorsRequired - soberMonitorIds.length !== 1 ? "s" : ""} to meet requirements
              </p>
            )}
            <div className="max-h-40 overflow-y-auto space-y-1">
              {members.filter((m) => m.membership_status === "active").map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer p-1.5 rounded hover:bg-background">
                  <input
                    type="checkbox"
                    checked={soberMonitorIds.includes(m.id)}
                    onChange={() => toggleSoberMonitor(m.id)}
                  />
                  <span>{m.full_name}</span>
                </label>
              ))}
            </div>
          </Card>

          <div className="space-y-2">
            {RISK_CHECKLIST_ITEMS.map((item) => (
              <label key={item.key} className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-surface-1">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded"
                  checked={!!newChecklist[item.key]}
                  onChange={(e) => setNewChecklist({ ...newChecklist, [item.key]: e.target.checked })}
                />
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="p-3 rounded-lg border border-border bg-surface-1">
            <p className="text-sm font-medium">Risk score: {formScore}% · {formRisk.label}</p>
            <ProgressBar value={formScore} color={formRisk.color} className="mt-2" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Notes</label>
            <textarea className="min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="Add any additional risk notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
