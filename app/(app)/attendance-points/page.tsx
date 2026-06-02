"use client";

import { useState, useEffect, useCallback } from "react";
import { Award, Plus, TrendingUp } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import {
  Badge, Button, Card, CardHeader, EmptyState, Input,
  Modal, PageHeader, ProgressBar, StatCard,
} from "@/components/ui";
import type { MemberProfile } from "@/types";
import { DEFAULT_POINT_RULES, getPointRules } from "@/lib/attendance-points";

interface PointEntry {
  id: string;
  member_id: string;
  points: number;
  reason: string | null;
  entry_type: string;
  created_at: string;
}

export default function AttendancePointsPage() {
  const supabase = createClient();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [entries, setEntries] = useState<PointEntry[]>([]);
  const [awardOpen, setAwardOpen] = useState(false);
  const [form, setForm] = useState({ memberId: "", points: "1", reason: "" });
  const [rules, setRules] = useState(DEFAULT_POINT_RULES);

  const load = useCallback(async (oid: string) => {
    const [mRes, eRes] = await Promise.all([
      supabase.from("member_profiles").select("*").eq("org_id", oid).order("full_name"),
      supabase.from("member_point_entries").select("*").eq("org_id", oid).order("created_at", { ascending: false }).limit(50),
    ]);
    setMembers((mRes.data ?? []) as MemberProfile[]);
    setEntries((eRes.data ?? []) as PointEntry[]);
    const loadedRules = await getPointRules(supabase, oid);
    setRules(loadedRules);
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

  function memberPoints(memberId: string) {
    return entries.filter((e) => e.member_id === memberId).reduce((s, e) => s + (e.entry_type === "deduction" ? -e.points : e.points), 0);
  }

  async function awardPoints() {
    if (!orgId || !form.memberId || !form.points) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("member_point_entries").insert({
      org_id: orgId,
      member_id: form.memberId,
      points: parseInt(form.points, 10),
      reason: form.reason || "Manual award",
      entry_type: "earned",
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Points awarded");
    setAwardOpen(false);
    setForm({ memberId: "", points: "1", reason: "" });
    load(orgId);
  }

  const leaderboard = [...members]
    .map((m) => ({ ...m, pts: memberPoints(m.id) }))
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 10);

  const minEligible = 20;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Attendance & Points"
        description="Track required events, points, service hours, and eligibility"
        action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setAwardOpen(true)}>Award points</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard title="Members tracked" value={members.length} icon={<Award size={18} />} />
        <StatCard title="Point entries" value={entries.length} icon={<TrendingUp size={18} />} />
        <StatCard title="Eligibility threshold" value={`${minEligible} pts`} icon={<Award size={18} />} />
      </div>

      <Card>
        <CardHeader title="Point rules by event type" description="Points auto-awarded on QR check-in (when rules configured)" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {rules.map((r) => (
            <div key={r.event_type} className="p-3 rounded-lg border border-border text-sm">
              <span className="font-medium">{r.label}</span>
              <Badge label={`+${r.points} pts`} color="green" className="ml-2" />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Leaderboard" />
        {leaderboard.length === 0 ? (
          <EmptyState icon={<Award size={20} />} title="No points yet" description="Award points after events or configure auto-awards on check-in." />
        ) : (
          <div className="space-y-2">
            {leaderboard.map((m, i) => {
              const eligible = m.pts >= minEligible;
              return (
                <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-1">
                  <span className="w-6 text-center font-bold text-muted-foreground">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{m.full_name}</p>
                    <ProgressBar value={Math.min(100, Math.round((m.pts / minEligible) * 100))} label={`${m.pts} points`} color={eligible ? "green" : "yellow"} size="sm" />
                  </div>
                  <Badge label={eligible ? "Eligible" : "Below min"} color={eligible ? "green" : "red"} />
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal open={awardOpen} onClose={() => setAwardOpen(false)} title="Award points" footer={<><Button variant="secondary" onClick={() => setAwardOpen(false)}>Cancel</Button><Button onClick={awardPoints}>Award</Button></>}>
        <div className="space-y-3">
          <select className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm" value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })}>
            <option value="">Select member</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </select>
          <Input label="Points" type="number" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} />
          <Input label="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Philanthropy event attendance" />
        </div>
      </Modal>
    </div>
  );
}
