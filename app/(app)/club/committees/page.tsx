"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import toast from "react-hot-toast";
import { useOrg } from "@/hooks/use-org";
import { can } from "@/lib/permissions";
import {
  Badge, Button, Card, CardHeader, EmptyState, Input, Modal, PageHeader, Select,
} from "@/components/ui";
import { isClubOrg } from "@/lib/utils";

const SUGGESTED_COMMITTEES = [
  "Events",
  "Finance",
  "Marketing / PR",
  "Membership",
  "Community service",
  "Professional development",
  "Social",
  "Technology",
];

interface MemberRow {
  id: string;
  full_name: string;
  role: string;
  committees: string[] | null;
}

export default function ClubCommitteesPage() {
  const { orgId, orgType, role } = useOrg();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMember, setEditMember] = useState<MemberRow | null>(null);
  const [committeeInput, setCommitteeInput] = useState("");
  const [saving, setSaving] = useState(false);

  const canEdit = can(role, "edit_roster");

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const res = await fetch(`/api/members?org_id=${encodeURIComponent(oid)}`);
    if (res.ok) {
      const data = (await res.json()) as MemberRow[];
      setMembers(data.map((m) => ({
        id: m.id,
        full_name: m.full_name,
        role: m.role,
        committees: m.committees,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!orgId) return;
    if (isClubOrg(orgType)) load(orgId);
    else setLoading(false);
  }, [orgId, orgType, load]);

  async function saveCommittees() {
    if (!orgId || !editMember) return;
    const list = committeeInput
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    setSaving(true);
    const res = await fetch(`/api/members/${editMember.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, committees: list }),
    });
    setSaving(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error((data as { error?: string }).error ?? "Failed to save");
      return;
    }
    toast.success("Committees updated");
    setEditMember(null);
    load(orgId);
  }

  const committeeMap = new Map<string, MemberRow[]>();
  for (const m of members) {
    const list = m.committees?.length ? m.committees : ["Unassigned"];
    for (const c of list) {
      if (!committeeMap.has(c)) committeeMap.set(c, []);
      committeeMap.get(c)!.push(m);
    }
  }

  if (!loading && orgType && !isClubOrg(orgType)) {
    return <PageHeader title="Committees" description="ClubOS feature for student organizations." />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Committees & working groups"
        description="Assign members to committees — used for events, budgets, and service tracking"
      />

      <Card padding="sm">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Suggested committees</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_COMMITTEES.map((c) => (
            <Badge key={c} label={c} color="gray" />
          ))}
        </div>
      </Card>

      {loading ? (
        <Card className="h-32 animate-pulse bg-surface-2 border-0">&nbsp;</Card>
      ) : members.length === 0 ? (
        <EmptyState icon={<Users size={24} />} title="No members" description="Add members to your roster first." />
      ) : (
        <>
          <Card>
            <CardHeader title="By committee" />
            <div className="space-y-3">
              {[...committeeMap.entries()].map(([name, list]) => (
                <div key={name} className="p-3 rounded-xl border border-border">
                  <p className="font-semibold text-sm mb-2">{name}</p>
                  <div className="flex flex-wrap gap-2">
                    {list.map((m) => (
                      <Badge key={m.id} label={m.full_name} color="blue" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="All members"
              description={canEdit ? "Click Assign to edit committee membership" : undefined}
            />
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-surface-1">
                  <div className="min-w-0">
                    <Link href={`/roster/${m.id}`} className="font-medium text-sm text-greek-600 hover:underline">
                      {m.full_name}
                    </Link>
                    <p className="text-xs text-muted-foreground truncate">
                      {(m.committees?.length ? m.committees.join(", ") : "Unassigned")}
                    </p>
                  </div>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditMember(m);
                        setCommitteeInput((m.committees ?? []).join(", "));
                      }}
                    >
                      Assign
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      <Modal
        open={!!editMember}
        onClose={() => setEditMember(null)}
        title={`Committees — ${editMember?.full_name ?? ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditMember(null)}>Cancel</Button>
            <Button loading={saving} onClick={saveCommittees}>Save</Button>
          </>
        }
      >
        <Input
          label="Committees (comma-separated)"
          value={committeeInput}
          onChange={(e) => setCommitteeInput(e.target.value)}
          placeholder="Events, Finance, Social"
        />
        <Select
          label="Quick add"
          value=""
          onChange={(e) => {
            if (!e.target.value) return;
            const parts = committeeInput.split(",").map((s) => s.trim()).filter(Boolean);
            if (!parts.includes(e.target.value)) {
              setCommitteeInput([...parts, e.target.value].join(", "));
            }
          }}
          options={[{ value: "", label: "Choose…" }, ...SUGGESTED_COMMITTEES.map((c) => ({ value: c, label: c }))]}
        />
      </Modal>
    </div>
  );
}
