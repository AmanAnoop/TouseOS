"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import toast from "react-hot-toast";
import { useOrg } from "@/hooks/use-org";
import { can } from "@/lib/permissions";
import {
  Badge, Button, Card, CardHeader, EmptyState, Modal, PageHeader, Skeleton,
  MemberIdentity,
} from "@/components/ui";
import { isClubOrg } from "@/lib/utils";

const SUGGESTED_COMMITTEES = [
  "Events",
  "Finance",
  "Philanthropy",
  "Marketing / PR",
  "Membership",
  "Community service",
  "Professional development",
  "Social",
  "Technology",
] as const;

interface MemberRow {
  id: string;
  full_name: string;
  role: string;
  committees: string[] | null;
  profile_photo_url?: string | null;
}

export default function ClubCommitteesPage() {
  const { orgId, orgType, role } = useOrg();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMember, setEditMember] = useState<MemberRow | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
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
        profile_photo_url: m.profile_photo_url,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!orgId) return;
    if (isClubOrg(orgType)) load(orgId);
    else setLoading(false);
  }, [orgId, orgType, load]);

  function openEdit(m: MemberRow) {
    setEditMember(m);
    setSelected(new Set(m.committees ?? []));
  }

  function toggleCommittee(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function saveCommittees() {
    if (!orgId || !editMember) return;
    setSaving(true);
    const res = await fetch(`/api/members/${editMember.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, committees: [...selected] }),
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
    const list = m.committees?.length ? m.committees : [];
    if (list.length === 0) {
      const unassigned = committeeMap.get("Unassigned") ?? [];
      unassigned.push(m);
      committeeMap.set("Unassigned", unassigned);
    } else {
      for (const c of list) {
        if (!committeeMap.has(c)) committeeMap.set(c, []);
        committeeMap.get(c)!.push(m);
      }
    }
  }

  const sortedCommittees = [...committeeMap.entries()].sort(([a], [b]) => {
    if (a === "Unassigned") return 1;
    if (b === "Unassigned") return -1;
    return a.localeCompare(b);
  });

  if (!loading && orgType && !isClubOrg(orgType)) {
    return <PageHeader title="Committees" description="ClubOS feature for student organizations." />;
  }

  return (
    <div className="ds-page-stack">
      <PageHeader
        title="Committees & working groups"
        description="Assign members to committees — events, philanthropy, finance, and more"
      />

      <Card padding="sm">
        <p className="type-label" style={{ marginBottom: 12 }}>Standard committees</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_COMMITTEES.map((c) => (
            <Badge key={c} label={c} color={c === "Philanthropy" ? "purple" : "gray"} />
          ))}
        </div>
      </Card>

      {loading ? (
        <Skeleton style={{ height: 128, width: "100%" }} />
      ) : members.length === 0 ? (
        <EmptyState icon={<Users size={24} />} title="No members" description="Add members to your roster first." />
      ) : (
        <>
          <Card>
            <CardHeader title="By committee" />
            <div className="space-y-4">
              {sortedCommittees.map(([name, list]) => (
                <div key={name} className="p-4 rounded-lg border border-border">
                  <p className="font-semibold text-sm text-foreground mb-3">{name}</p>
                  <div className="space-y-2">
                    {list.map((m) => (
                      <div key={m.id} className="flex items-center justify-between gap-3">
                        <MemberIdentity
                          name={m.full_name}
                          src={m.profile_photo_url}
                          subtitle={m.role.replace(/_/g, " ")}
                          size="sm"
                        />
                        {canEdit && (
                          <Button variant="secondary" size="sm" onClick={() => openEdit(m)}>
                            Edit
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="All members"
              description={canEdit ? "Assign committees per member" : undefined}
            />
            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-4 p-3 rounded-lg hover:bg-bg-subtle transition-colors"
                >
                  <MemberIdentity
                    name={m.full_name}
                    src={m.profile_photo_url}
                    subtitle={(m.committees?.length ? m.committees.join(", ") : "No committees assigned")}
                    size="sm"
                  />
                  {canEdit && (
                    <Button variant="secondary" size="sm" onClick={() => openEdit(m)}>
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
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditMember(null)}>Cancel</Button>
            <Button loading={saving} onClick={saveCommittees}>Save</Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground mb-4">
          Select all committees this member serves on. Philanthropy covers fundraising and service initiatives.
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          {SUGGESTED_COMMITTEES.map((c) => (
            <label
              key={c}
              className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-bg-subtle"
            >
              <input
                type="checkbox"
                checked={selected.has(c)}
                onChange={() => toggleCommittee(c)}
                className="h-4 w-4 accent-[var(--color-org-primary)]"
              />
              <span className="text-sm font-medium text-foreground">{c}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Need a custom committee?{" "}
          <Link href="/roster" className="text-foreground underline">
            Contact an officer
          </Link>{" "}
          or add via roster settings.
        </p>
      </Modal>
    </div>
  );
}
