"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { useOrg } from "@/hooks/use-org";
import {
  Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, Textarea,
} from "@/components/ui";
import { can } from "@/lib/permissions";
import { isClubOrg } from "@/lib/utils";

interface Application {
  id: string;
  full_name: string;
  email: string | null;
  class_year: string | null;
  status: string;
  interests: string | null;
  notes: string | null;
  created_at: string;
}

export default function ClubMembershipPage() {
  const { orgId, orgType, role } = useOrg();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", classYear: "", interests: "", notes: "" });

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const res = await fetch(`/api/club/membership?org_id=${oid}`);
    const data = await res.json();
    if (res.ok) setApps(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!orgId) return;
    if (isClubOrg(orgType)) load(orgId);
    else setLoading(false);
  }, [orgId, orgType, load]);

  const canManage = can(role, "edit_roster");

  async function addApplication() {
    if (!orgId || !form.fullName) return;
    const res = await fetch("/api/club/membership", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, ...form, fullName: form.fullName }),
    });
    if (res.ok) {
      toast.success("Application added");
      setOpen(false);
      setForm({ fullName: "", email: "", classYear: "", interests: "", notes: "" });
      load(orgId);
    } else toast.error("Failed to add");
  }

  async function updateStatus(id: string, status: string) {
    if (!orgId) return;
    const res = await fetch("/api/club/membership", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, orgId, status }),
    });
    if (res.ok) {
      toast.success("Status updated");
      load(orgId);
    }
  }

  if (!loading && orgType && !isClubOrg(orgType)) {
    return (
      <PageHeader title="Membership" description="ClubOS feature for student organizations only." />
    );
  }

  return (
    <div className="ds-page-stack">
      <PageHeader
        title="Membership pipeline"
        description="Track applicants from info session through acceptance — built for clubs, not Greek recruitment"
        action={
          canManage ? (
            <Button size="sm" className="bg-club-600 hover:bg-club-700 officer-touch" icon={<Plus size={14} />} onClick={() => setOpen(true)}>
              Add applicant
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="h-40 rounded-xl bg-surface-2 animate-pulse" />
      ) : apps.length === 0 ? (
        <EmptyState
          icon={<UserPlus size={24} />}
          title="No membership applications"
          description="Log interest form submissions or tabling sign-ups here."
          action={canManage ? <Button size="sm" onClick={() => setOpen(true)}>Add first applicant</Button> : undefined}
        />
      ) : (
        <div className="space-y-3">
          {apps.map((a) => (
            <Card key={a.id} padding="sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{a.full_name}</p>
                  <p className="text-xs text-muted-foreground">{a.email ?? "—"} · {a.class_year ?? "Year N/A"}</p>
                  {a.interests && <p className="text-sm mt-1">{a.interests}</p>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge label={a.status} color={a.status === "accepted" ? "green" : a.status === "declined" ? "red" : "yellow"} />
                  {canManage && (
                    <Select
                      value={a.status}
                      onChange={(e) => updateStatus(a.id, e.target.value)}
                      options={[
                        { value: "applied", label: "Applied" },
                        { value: "interview", label: "Interview" },
                        { value: "accepted", label: "Accepted" },
                        { value: "waitlisted", label: "Waitlisted" },
                        { value: "declined", label: "Declined" },
                      ]}
                    />
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New membership applicant" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button className="bg-club-600 hover:bg-club-700" onClick={addApplication}>Save</Button></>}>
        <div className="space-y-3">
          <Input label="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Class year" placeholder="2027" value={form.classYear} onChange={(e) => setForm({ ...form, classYear: e.target.value })} />
          <Textarea label="Interests / why they want to join" value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} />
          <Textarea label="Officer notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
