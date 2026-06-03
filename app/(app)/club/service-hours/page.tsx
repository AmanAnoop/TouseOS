"use client";

import { useState, useEffect, useCallback } from "react";
import { HandHeart, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { useOrg } from "@/hooks/use-org";
import {
  Badge, Button, Card, EmptyState, Input, Modal, PageHeader, ProgressBar, Select, Textarea,
} from "@/components/ui";
import { can } from "@/lib/permissions";
import { isClubOrg } from "@/lib/utils";
import type { MemberProfile } from "@/types";

interface HourEntry {
  id: string;
  hours: number;
  activity: string;
  event_date: string | null;
  verified: boolean;
  member_name: string | null;
  member_profiles?: { full_name: string } | null;
}

export default function ClubServiceHoursPage() {
  const { orgId, orgType, role } = useOrg();
  const [entries, setEntries] = useState<HourEntry[]>([]);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [goal, setGoal] = useState({ semester_label: "Current semester", target_hours: 100 });
  const [goalEdit, setGoalEdit] = useState(false);
  const [form, setForm] = useState({ memberId: "", hours: "", activity: "", eventDate: "" });

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const [hoursRes, membersRes, goalRes] = await Promise.all([
      fetch(`/api/club/service-hours?org_id=${oid}`),
      fetch(`/api/members?org_id=${encodeURIComponent(oid)}`),
      fetch(`/api/club/service-goals?org_id=${oid}`),
    ]);
    const goalData = await goalRes.json();
    if (goalRes.ok) setGoal(goalData);
    const hours = await hoursRes.json();
    if (hoursRes.ok) setEntries(hours);
    if (membersRes.ok) setMembers((await membersRes.json()) as MemberProfile[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!orgId) return;
    if (isClubOrg(orgType)) load(orgId);
    else setLoading(false);
  }, [orgId, orgType, load]);

  const canVerify = can(role, "edit_roster");
  const total = entries.reduce((s, e) => s + Number(e.hours), 0);
  const verified = entries.filter((e) => e.verified).reduce((s, e) => s + Number(e.hours), 0);
  const goalPct = goal.target_hours > 0 ? Math.min(100, Math.round((verified / Number(goal.target_hours)) * 100)) : 0;

  async function saveGoal() {
    if (!orgId) return;
    const res = await fetch("/api/club/service-goals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        semesterLabel: goal.semester_label,
        targetHours: goal.target_hours,
      }),
    });
    if (res.ok) {
      toast.success("Goal updated");
      setGoalEdit(false);
      load(orgId);
    }
  }

  async function logHours() {
    if (!orgId || !form.hours || !form.activity) return;
    const member = members.find((m) => m.id === form.memberId);
    const res = await fetch("/api/club/service-hours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        memberId: form.memberId || null,
        memberName: member?.full_name ?? null,
        hours: form.hours,
        activity: form.activity,
        eventDate: form.eventDate || null,
      }),
    });
    if (res.ok) {
      toast.success("Hours logged");
      setOpen(false);
      setForm({ memberId: "", hours: "", activity: "", eventDate: "" });
      load(orgId);
    }
  }

  async function toggleVerified(id: string, verified: boolean) {
    if (!orgId) return;
    const res = await fetch("/api/club/service-hours", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, orgId, verified: !verified }),
    });
    if (res.ok) load(orgId);
  }

  if (!loading && orgType && !isClubOrg(orgType)) {
    return <PageHeader title="Service hours" description="ClubOS feature for student organizations." />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Service hours"
        description="Log community service for awards, dean's list recognition, and national org reporting"
        action={
          <Button size="sm" className="bg-club-600 hover:bg-club-700 officer-touch" icon={<Plus size={14} />} onClick={() => setOpen(true)}>
            Log hours
          </Button>
        }
      />

      <Card>
        <div className="flex items-start justify-between gap-2 flex-wrap mb-3">
          <p className="text-sm font-semibold">Semester goal — {goal.semester_label}</p>
          {canVerify && (
            <Button variant="secondary" size="sm" onClick={() => setGoalEdit(!goalEdit)}>
              {goalEdit ? "Cancel" : "Edit goal"}
            </Button>
          )}
        </div>
        {goalEdit ? (
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <Input label="Label" value={goal.semester_label} onChange={(e) => setGoal({ ...goal, semester_label: e.target.value })} />
            <Input label="Target hours" type="number" value={String(goal.target_hours)} onChange={(e) => setGoal({ ...goal, target_hours: parseFloat(e.target.value) || 0 })} />
            <Button className="bg-club-600 hover:bg-club-700 sm:col-span-2" size="sm" onClick={saveGoal}>Save goal</Button>
          </div>
        ) : (
          <ProgressBar value={goalPct} label={`${verified.toFixed(1)} / ${goal.target_hours} verified hours`} color={goalPct >= 100 ? "green" : "yellow"} size="md" />
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3 max-w-md">
        <Card padding="sm">
          <p className="text-xs text-muted-foreground uppercase">Total logged</p>
          <p className="text-2xl font-bold">{total.toFixed(1)}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-muted-foreground uppercase">Verified</p>
          <p className="text-2xl font-bold text-club-600">{verified.toFixed(1)}</p>
        </Card>
      </div>

      {loading ? (
        <div className="h-40 rounded-xl bg-surface-2 animate-pulse" />
      ) : entries.length === 0 ? (
        <EmptyState icon={<HandHeart size={24} />} title="No service hours yet" description="Track volunteer events, tabling, and community projects." />
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <Card key={e.id} padding="sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{e.activity}</p>
                  <p className="text-xs text-muted-foreground">
                    {(e.member_profiles as { full_name?: string } | null)?.full_name ?? e.member_name ?? "Member"} · {e.hours}h
                    {e.event_date ? ` · ${e.event_date}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge label={e.verified ? "Verified" : "Pending"} color={e.verified ? "green" : "yellow"} />
                  {canVerify && (
                    <Button variant="secondary" size="sm" onClick={() => toggleVerified(e.id, e.verified)}>
                      {e.verified ? "Unverify" : "Verify"}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Log service hours" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button className="bg-club-600 hover:bg-club-700" onClick={logHours}>Save</Button></>}>
        <div className="space-y-3">
          <Select
            label="Member"
            value={form.memberId}
            onChange={(e) => setForm({ ...form, memberId: e.target.value })}
            options={members.map((m) => ({ value: m.id, label: m.full_name }))}
            placeholder="Select member"
          />
          <Input label="Hours" type="number" step="0.5" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
          <Input label="Date" type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
          <Textarea label="Activity / organization served" value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
