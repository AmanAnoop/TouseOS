"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, CheckCircle2, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { useOrg } from "@/hooks/use-org";
import { usePermissions } from "@/hooks/use-permissions";
import {
  Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, StatCard,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";

interface StudyHourRow {
  id: string;
  session_date: string;
  location: string | null;
  hours: number;
  notes: string | null;
  verified_at: string | null;
  member_profiles: { full_name: string } | null;
}

export default function StudyHoursPage() {
  const { orgId } = useOrg();
  const { can } = usePermissions();
  const [rows, setRows] = useState<StudyHourRow[]>([]);
  const [members, setMembers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ memberId: "", sessionDate: "", location: "", hours: "2", notes: "" });

  const load = useCallback(async (oid: string) => {
    const [hRes, mRes] = await Promise.all([
      fetch(`/api/study-hours?org_id=${encodeURIComponent(oid)}`),
      fetch(`/api/members?org_id=${encodeURIComponent(oid)}`),
    ]);
    if (hRes.ok) setRows(await hRes.json());
    if (mRes.ok) {
      const data = await mRes.json();
      setMembers((data as Array<{ id: string; full_name: string; membership_status: string }>)
        .filter((m) => m.membership_status === "active")
        .map((m) => ({ id: m.id, full_name: m.full_name })));
    }
  }, []);

  useEffect(() => {
    if (orgId) load(orgId);
  }, [orgId, load]);

  const totalHours = rows.reduce((s, r) => s + Number(r.hours), 0);
  const verifiedHours = rows.filter((r) => r.verified_at).reduce((s, r) => s + Number(r.hours), 0);

  async function logHours() {
    if (!orgId || !form.memberId || !form.sessionDate) return;
    const res = await fetch("/api/study-hours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        memberId: form.memberId,
        sessionDate: form.sessionDate,
        location: form.location,
        hours: parseFloat(form.hours),
        notes: form.notes,
      }),
    });
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Failed");
      return;
    }
    toast.success("Study hours logged");
    setOpen(false);
    load(orgId);
  }

  async function verify(id: string) {
    if (!orgId) return;
    const res = await fetch("/api/study-hours", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, orgId, verify: true }),
    });
    if (res.ok) {
      toast.success("Verified");
      load(orgId);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Study Hours"
        description="Track and verify member study sessions"
        action={
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setOpen(true)}>Log hours</Button>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <StatCard title="Total logged" value={totalHours.toFixed(1)} icon={<BookOpen size={16} />} />
        <StatCard title="Verified" value={verifiedHours.toFixed(1)} icon={<CheckCircle2 size={16} />} />
        <StatCard title="Sessions" value={rows.length} />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<BookOpen size={24} />} title="No study hours yet" action={<Button size="sm" onClick={() => setOpen(true)}>Log first session</Button>} />
      ) : (
        <Card padding="none">
          <div className="divide-y divide-border">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium text-sm">{r.member_profiles?.full_name ?? "Member"}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(r.session_date)} · {r.hours}h{r.location ? ` · ${r.location}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {r.verified_at ? (
                    <Badge label="Verified" color="green" />
                  ) : can("edit_roster") ? (
                    <Button size="sm" variant="secondary" onClick={() => verify(r.id)}>Verify</Button>
                  ) : (
                    <Badge label="Pending" color="yellow" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Log study hours"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={logHours}>Save</Button></>}
      >
        <div className="space-y-3">
          <Select label="Member" value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })}
            options={[{ value: "", label: "Select member…" }, ...members.map((m) => ({ value: m.id, label: m.full_name }))]} />
          <Input label="Date" type="date" value={form.sessionDate} onChange={(e) => setForm({ ...form, sessionDate: e.target.value })} />
          <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Library, chapter house..." />
          <Input label="Hours" type="number" step="0.5" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
          <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
