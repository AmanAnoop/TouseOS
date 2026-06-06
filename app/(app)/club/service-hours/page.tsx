"use client";

import { useState, useEffect, useCallback } from "react";
import { HandHeart } from "lucide-react";
import toast from "react-hot-toast";
import { useOrg } from "@/hooks/use-org";
import {
  ActionMenu, Badge, Button, Card, EmptyState, Input, Modal,
  PageHeader, ProgressBar, Select, Skeleton, Textarea,
} from "@/components/ui";
import { can } from "@/lib/permissions";
import { isClubOrg } from "@/lib/utils";
import type { MemberProfile } from "@/types";

const SERVICE_TYPES = [
  { value: "community_service", label: "Community service" },
  { value: "philanthropy", label: "Philanthropy / fundraising" },
  { value: "tabling", label: "Tabling / outreach" },
  { value: "mentorship", label: "Mentorship / education" },
  { value: "environmental", label: "Environmental" },
  { value: "other", label: "Other" },
];

interface HourEntry {
  id: string;
  hours: number;
  activity: string;
  organization_served?: string | null;
  service_type?: string | null;
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
  const [form, setForm] = useState({
    memberId: "",
    hours: "",
    organizationServed: "",
    serviceType: "community_service",
    activityNotes: "",
    eventDate: "",
  });

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
    if (!orgId || !form.hours || !form.organizationServed.trim()) {
      toast.error("Member, hours, and organization served are required");
      return;
    }
    const member = members.find((m) => m.id === form.memberId);
    const res = await fetch("/api/club/service-hours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        memberId: form.memberId || null,
        memberName: member?.full_name ?? null,
        hours: form.hours,
        organizationServed: form.organizationServed.trim(),
        serviceType: form.serviceType,
        activityNotes: form.activityNotes.trim(),
        eventDate: form.eventDate || null,
      }),
    });
    if (res.ok) {
      toast.success("Hours logged");
      setOpen(false);
      setForm({
        memberId: "",
        hours: "",
        organizationServed: "",
        serviceType: "community_service",
        activityNotes: "",
        eventDate: "",
      });
      load(orgId);
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Failed to log hours");
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

  function serviceTypeLabel(value: string | null | undefined) {
    return SERVICE_TYPES.find((t) => t.value === value)?.label ?? value ?? "";
  }

  if (!loading && orgType && !isClubOrg(orgType)) {
    return <PageHeader title="Service hours" description="Log and verify volunteer hours for your organization." />;
  }

  return (
    <div className="ds-page-stack">
      <PageHeader
        title="Service hours"
        description="Log community service for awards, dean's list recognition, and national org reporting"
        action={
          <ActionMenu
            label="Service hours"
            items={[
              { label: "Log service hours", onClick: () => setOpen(true) },
              ...(canVerify
                ? [{ label: "Edit semester goal", onClick: () => setGoalEdit(true) }]
                : []),
            ]}
          />
        }
      />

      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
          <p className="text-sm font-semibold text-foreground">Semester goal — {goal.semester_label}</p>
          {canVerify && !goalEdit && (
            <Button variant="secondary" size="sm" onClick={() => setGoalEdit(true)}>
              Edit goal
            </Button>
          )}
        </div>
        {goalEdit ? (
          <div className="grid sm:grid-cols-2 gap-4 mb-3">
            <Input label="Label" value={goal.semester_label} onChange={(e) => setGoal({ ...goal, semester_label: e.target.value })} />
            <Input label="Target hours" type="number" value={String(goal.target_hours)} onChange={(e) => setGoal({ ...goal, target_hours: parseFloat(e.target.value) || 0 })} />
            <div className="sm:col-span-2 flex gap-2">
              <Button size="sm" onClick={saveGoal}>Save goal</Button>
              <Button variant="secondary" size="sm" onClick={() => setGoalEdit(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <ProgressBar value={goalPct} label={`${verified.toFixed(1)} / ${goal.target_hours} verified hours`} color={goalPct >= 100 ? "green" : "yellow"} size="md" />
        )}
      </Card>

      <div className="grid grid-cols-2 gap-4 max-w-md">
        <Card padding="sm">
          <p className="text-xs text-muted-foreground uppercase">Total logged</p>
          <p className="text-2xl font-bold text-foreground">{total.toFixed(1)}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-muted-foreground uppercase">Verified</p>
          <p className="text-2xl font-bold text-foreground">{verified.toFixed(1)}</p>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} style={{ height: 72, width: "100%" }} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<HandHeart size={24} />}
          title="No service hours yet"
          description="Track volunteer events, tabling, and community projects."
          action={<Button size="sm" onClick={() => setOpen(true)}>Log service hours</Button>}
        />
      ) : (
        <div className="space-y-3">
          {entries.map((e) => (
            <Card key={e.id} padding="sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {e.organization_served ?? e.activity}
                  </p>
                  {e.organization_served && e.activity !== e.organization_served && (
                    <p className="text-sm text-muted-foreground mt-0.5">{e.activity}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {(e.member_profiles as { full_name?: string } | null)?.full_name ?? e.member_name ?? "Member"}
                    {" · "}{e.hours}h
                    {e.service_type ? ` · ${serviceTypeLabel(e.service_type)}` : ""}
                    {e.event_date ? ` · ${e.event_date}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
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

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Log service hours"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={logHours}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Member"
            value={form.memberId}
            onChange={(e) => setForm({ ...form, memberId: e.target.value })}
            options={members.map((m) => ({ value: m.id, label: m.full_name }))}
            placeholder="Select member"
          />
          <Input
            label="Hours"
            type="number"
            step="0.5"
            min="0.5"
            value={form.hours}
            onChange={(e) => setForm({ ...form, hours: e.target.value })}
            required
          />
          <Input
            label="Date"
            type="date"
            value={form.eventDate}
            onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
          />
          <Select
            label="Service type"
            value={form.serviceType}
            onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
            options={SERVICE_TYPES}
          />
          <Input
            label="Organization served"
            placeholder="e.g. Habitat for Humanity, Local food bank"
            value={form.organizationServed}
            onChange={(e) => setForm({ ...form, organizationServed: e.target.value })}
            required
          />
          <Textarea
            label="What did you do? (optional)"
            placeholder="Brief description of the work"
            value={form.activityNotes}
            onChange={(e) => setForm({ ...form, activityNotes: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}
