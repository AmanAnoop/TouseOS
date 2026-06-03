"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Plus } from "lucide-react";
import toast from "react-hot-toast";
import {
  Alert, Badge, Button, Card, EmptyState, Input, Modal,
  PageHeader, Select, StatCard, Textarea,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { useOrg } from "@/hooks/use-org";
import type { RoleName } from "@/lib/permissions";

interface Injury {
  id: string;
  severity: string;
  body_area: string;
  context: string;
  description: string;
  incident_date: string;
  return_to_play_date: string | null;
  is_cleared: boolean;
  member_profiles: { full_name: string } | null;
}

const INJURY_OFFICER_ROLES: RoleName[] = [
  "captain", "co_captain", "coach", "safety_officer", "owner", "president", "advisor",
];

export function InjuriesClient() {
  const { orgId, role } = useOrg();
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [members, setMembers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [allowed, setAllowed] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    memberId: "", incidentDate: new Date().toISOString().slice(0, 10),
    context: "practice", bodyArea: "", severity: "minor", description: "",
  });

  const load = useCallback(async (oid: string) => {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const [injRes, memRes] = await Promise.all([
      supabase.from("sports_injuries").select("*, member_profiles(full_name)").eq("org_id", oid).order("incident_date", { ascending: false }),
      supabase.from("member_profiles").select("id, full_name").eq("org_id", oid).eq("membership_status", "active").order("full_name"),
    ]);
    setInjuries((injRes.data ?? []) as Injury[]);
    setMembers((memRes.data ?? []) as Array<{ id: string; full_name: string }>);
  }, []);

  useEffect(() => {
    if (!orgId) return;
    if (!INJURY_OFFICER_ROLES.includes(role)) {
      setAllowed(false);
      return;
    }
    setAllowed(true);
    load(orgId);
  }, [orgId, role, load]);

  async function fileReport() {
    if (!orgId || !form.memberId || !form.bodyArea) return;
    const res = await fetch("/api/injuries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, ...form }),
    });
    if (res.ok) {
      toast.success("Injury report filed");
      setOpen(false);
      load(orgId);
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed");
    }
  }

  async function markCleared(id: string) {
    if (!orgId) return;
    const res = await fetch("/api/injuries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isCleared: true }),
    });
    if (res.ok) {
      toast.success("Marked cleared");
      load(orgId);
    }
  }

  if (!allowed) {
    return (
      <div className="space-y-5">
        <PageHeader title="Injury Reports" />
        <Alert type="warning" title="Access restricted" description="Only captains, coaches, safety officers, and advisors can view injury data." />
      </div>
    );
  }

  const active = injuries.filter((i) => !i.is_cleared);
  const cleared = injuries.filter((i) => i.is_cleared);
  const SEVERITY_COLOR: Record<string, "green" | "yellow" | "orange" | "red" | "gray"> = {
    minor: "green", moderate: "yellow", severe: "orange", critical: "red",
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Injury Reports"
        description="Confidential — restricted roles only"
        action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setOpen(true)}>File report</Button>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Active" value={active.length} icon={<AlertTriangle size={18} />} />
        <StatCard title="Cleared" value={cleared.length} icon={<CheckCircle2 size={18} />} />
        <StatCard title="Total" value={injuries.length} icon={<AlertTriangle size={18} />} />
        <StatCard title="Severe+" value={injuries.filter((i) => ["severe", "critical"].includes(i.severity)).length} icon={<AlertTriangle size={18} />} />
      </div>

      {active.map((injury) => (
        <Card key={injury.id}>
          <div className="flex items-start justify-between gap-3 p-4">
            <div>
              <p className="font-semibold">{injury.member_profiles?.full_name ?? "Player"}</p>
              <p className="text-xs text-muted-foreground">{injury.body_area} · {injury.severity} · {formatDate(injury.incident_date)}</p>
              <p className="text-sm text-muted-foreground mt-1">{injury.description}</p>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Badge label={injury.severity} color={SEVERITY_COLOR[injury.severity] ?? "gray"} />
              <Button size="sm" variant="secondary" onClick={() => markCleared(injury.id)}>Mark cleared</Button>
            </div>
          </div>
        </Card>
      ))}

      {injuries.length === 0 && (
        <EmptyState icon={<CheckCircle2 size={24} />} title="No injuries on file" action={<Button size="sm" onClick={() => setOpen(true)}>File report</Button>} />
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="File injury report" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={fileReport}>Submit</Button></>}>
        <div className="space-y-3">
          <Select label="Player" value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })} options={[{ value: "", label: "Select" }, ...members.map((m) => ({ value: m.id, label: m.full_name }))]} />
          <Input label="Incident date" type="date" value={form.incidentDate} onChange={(e) => setForm({ ...form, incidentDate: e.target.value })} />
          <Select label="Context" value={form.context} onChange={(e) => setForm({ ...form, context: e.target.value })} options={["practice", "game", "tournament", "other"].map((v) => ({ value: v, label: v }))} />
          <Input label="Body area" value={form.bodyArea} onChange={(e) => setForm({ ...form, bodyArea: e.target.value })} placeholder="Knee, ankle…" />
          <Select label="Severity" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} options={["minor", "moderate", "severe", "critical"].map((v) => ({ value: v, label: v }))} />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} />
        </div>
      </Modal>
    </div>
  );
}
