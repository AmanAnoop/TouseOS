"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Plus, Shield } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import {
  Alert, Badge, Button, Card, CardHeader,
  EmptyState, Modal, PageHeader, ProgressBar, StatCard,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";

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
  created_at: string;
}

const CHECKLIST_ITEMS = [
  { key: "alcohol_policy", label: "Alcohol policy checklist completed", risk: 20 },
  { key: "sober_monitors_assigned", label: "Sober monitors assigned", risk: 15 },
  { key: "guest_ratio_checked", label: "Guest ratio within limits", risk: 10 },
  { key: "venue_contract_uploaded", label: "Venue contract uploaded", risk: 10 },
  { key: "transportation_plan", label: "Transportation plan in place", risk: 15 },
  { key: "security_plan", label: "Security/door plan confirmed", risk: 15 },
  { key: "emergency_plan", label: "Emergency action plan ready", risk: 10 },
  { key: "food_water_plan", label: "Food and water available", risk: 5 },
];

export default function RiskPage() {
  const supabase = createClient();
  const [checklists, setChecklists] = useState<RiskChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [events, setEvents] = useState<Array<{ id: string; title: string; starts_at: string }>>([]);

  const [newChecklist, setNewChecklist] = useState<Record<string, boolean>>({
    alcohol_policy: false,
    sober_monitors_assigned: false,
    guest_ratio_checked: false,
    venue_contract_uploaded: false,
    transportation_plan: false,
    security_plan: false,
    emergency_plan: false,
    food_water_plan: false,
  });
  const [selectedEventId, setSelectedEventId] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const [ckRes, evRes] = await Promise.all([
      supabase.from("risk_checklists").select("*").eq("org_id", oid).order("created_at", { ascending: false }),
      supabase.from("events").select("id, title, starts_at").eq("org_id", oid).gte("starts_at", new Date().toISOString()).order("starts_at").limit(20),
    ]);
    setChecklists((ckRes.data ?? []) as RiskChecklist[]);
    setEvents((evRes.data ?? []) as Array<{ id: string; title: string; starts_at: string }>);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: m } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single();
      if (m) { setOrgId(m.org_id); load(m.org_id); }
    }
    init();
  }, [supabase, load]);

  function computeRiskScore(items: Record<string, boolean>) {
    const completed = CHECKLIST_ITEMS.filter((i) => items[i.key]).length;
    return Math.round((completed / CHECKLIST_ITEMS.length) * 100);
  }

  async function createChecklist() {
    if (!orgId) return;
    const score = computeRiskScore(newChecklist);
    const { error } = await supabase.from("risk_checklists").insert({
      org_id: orgId,
      event_id: selectedEventId || null,
      ...newChecklist,
      risk_score: score,
      notes: notes || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Risk checklist saved");
    setCreateOpen(false);
    setNewChecklist(Object.fromEntries(CHECKLIST_ITEMS.map((i) => [i.key, false])));
    setNotes("");
    setSelectedEventId("");
    load(orgId);
  }

  async function approveChecklist(id: string) {
    await supabase.from("risk_checklists").update({ approved: true }).eq("id", id);
    setChecklists((prev) => prev.map((c) => c.id === id ? { ...c, approved: true } : c));
    toast.success("Checklist approved");
  }

  const approved = checklists.filter((c) => c.approved).length;
  const pending = checklists.filter((c) => !c.approved).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Risk Management"
        description="Event risk checklists, incident reports, and approval workflows"
        action={
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
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
        <div className="space-y-3">{[1,2,3].map((i) => <Card key={i} className="h-24 animate-pulse bg-surface-2 border-0">&nbsp;</Card>)}</div>
      ) : checklists.length === 0 ? (
        <EmptyState
          icon={<Shield size={24} />}
          title="No risk checklists"
          description="Create a risk checklist before your next social event."
          action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>Create checklist</Button>}
        />
      ) : (
        <div className="space-y-3">
          {checklists.map((c) => {
            const score = c.risk_score ?? 0;
            const color = score >= 80 ? "green" : score >= 60 ? "yellow" : "red";
            const label = score >= 80 ? "Low risk" : score >= 60 ? "Medium risk" : "High risk";
            const items = CHECKLIST_ITEMS.map((item) => ({
              ...item,
              checked: Boolean(c[item.key as keyof RiskChecklist]),
            }));
            return (
              <Card key={c.id}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-sm text-foreground">Risk checklist · {formatDate(c.created_at)}</p>
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
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  {items.map((item) => (
                    <div key={item.key} className="flex items-center gap-1.5 text-xs">
                      {item.checked
                        ? <CheckCircle2 size={13} className="text-green-500 flex-shrink-0" />
                        : <AlertTriangle size={13} className="text-yellow-500 flex-shrink-0" />
                      }
                      <span className={item.checked ? "text-muted-foreground line-through" : "text-foreground"}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader title="Incident reports" description="File and track risk incidents" icon={<AlertTriangle size={16} />}
          action={<Link href="/api/incidents" className="text-xs text-greek-600 hover:underline">View all</Link>} />
        <div className="space-y-2">
          {["Anonymous report", "Officer-only report", "Standards referral"].map((type) => (
            <div key={type} className="flex items-center justify-between p-3 border border-border rounded-lg">
              <p className="text-sm font-medium">{type}</p>
              <Button size="sm" variant="secondary">File report</Button>
            </div>
          ))}
        </div>
      </Card>

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

          <div className="space-y-3">
            {CHECKLIST_ITEMS.map((item) => (
              <label key={item.key} className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-surface-1">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded"
                  checked={!!newChecklist[item.key]}
                  onChange={(e) => setNewChecklist({ ...newChecklist, [item.key]: e.target.checked })}
                />
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">Risk weight: {item.risk}%</p>
                </div>
              </label>
            ))}
          </div>

          <div className="p-3 rounded-lg border border-border bg-surface-1">
            <p className="text-sm font-medium">Risk score: {computeRiskScore(newChecklist)}%</p>
            <ProgressBar value={computeRiskScore(newChecklist)} color={computeRiskScore(newChecklist) >= 80 ? "green" : computeRiskScore(newChecklist) >= 60 ? "yellow" : "red"} className="mt-2" />
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
