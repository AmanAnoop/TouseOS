"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { GitBranch, Plus, Trash2, User } from "lucide-react";
import {
  Avatar, Badge, Button, Card, CardHeader, EmptyState, Select,
} from "@/components/ui";
import type { PnmLead } from "@/types";

interface RelationshipRow {
  id: string;
  relationship_type: string;
  strength: number;
  is_follow_up_owner: boolean;
  notes: string | null;
  member_profiles: {
    id: string;
    full_name: string;
    profile_photo_url: string | null;
    major: string | null;
    hometown: string | null;
  } | null;
}

interface Suggestion {
  memberId: string;
  memberName: string;
  relationshipType: string;
  strength: number;
  reason: string;
}

interface MemberOption {
  id: string;
  full_name: string;
}

interface RelationshipGraphPanelProps {
  orgId: string | null;
  pnm: PnmLead | null;
  members: MemberOption[];
}

const TYPE_OPTIONS = [
  { value: "friend", label: "Friend" },
  { value: "referral", label: "Referral" },
  { value: "same_major", label: "Same major" },
  { value: "same_hometown", label: "Same hometown" },
  { value: "same_class", label: "Same class" },
  { value: "family", label: "Family" },
  { value: "roommate", label: "Roommate" },
  { value: "alumni_referral", label: "Alumni referral" },
  { value: "other", label: "Other" },
];

export function RelationshipGraphPanel({ orgId, pnm, members }: RelationshipGraphPanelProps) {
  const [rows, setRows] = useState<RelationshipRow[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [addMemberId, setAddMemberId] = useState("");
  const [addType, setAddType] = useState("friend");

  const load = useCallback(async () => {
    if (!orgId || !pnm) return;
    setLoading(true);
    const res = await fetch(
      `/api/pnm/relationships?org_id=${orgId}&pnm_id=${pnm.id}&suggest=true`,
    );
    const data = await res.json();
    if (res.ok) {
      setRows(data.relationships ?? []);
      setSuggestions(data.suggestions ?? []);
    }
    setLoading(false);
  }, [orgId, pnm]);

  useEffect(() => {
    load();
  }, [load]);

  async function addRelationship(
    memberId: string,
    relationshipType: string,
    strength: number,
    isFollowUpOwner = false,
  ) {
    if (!pnm) return;
    const res = await fetch("/api/pnm/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pnmId: pnm.id,
        memberId,
        relationshipType,
        strength,
        isFollowUpOwner,
      }),
    });
    if (res.ok) {
      toast.success("Connection added");
      load();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed");
    }
  }

  async function removeRelationship(id: string) {
    const res = await fetch(`/api/pnm/relationships?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Removed");
      load();
    }
  }

  if (!pnm) {
    return (
      <Card>
        <EmptyState icon={<GitBranch size={20} />} title="Select a PNM" description="See who in the chapter knows this recruit." />
      </Card>
    );
  }

  const followUp = rows.find((r) => r.is_follow_up_owner);

  return (
    <Card>
      <CardHeader
        title="Relationship graph"
        description="Who knows this PNM — referral paths and follow-up owner"
        icon={<GitBranch size={16} />}
        action={
          <Button size="sm" variant="secondary" loading={loading} onClick={() => load()}>
            Refresh
          </Button>
        }
      />

      {followUp?.member_profiles && (
        <div className="mb-4 p-3 rounded-lg bg-greek-50 dark:bg-greek-950/30 border border-greek-200 dark:border-greek-800">
          <p className="text-xs text-muted-foreground mb-1">Follow-up owner</p>
          <Link href={`/roster/${followUp.member_profiles.id}`} className="text-sm font-medium text-greek-700 dark:text-greek-300 hover:underline">
            {followUp.member_profiles.full_name}
          </Link>
        </div>
      )}

      {rows.length === 0 && !loading ? (
        <EmptyState title="No connections logged" description="Add brothers who know this PNM or accept a suggestion below." />
      ) : (
        <div className="space-y-2 mb-4">
          {rows.map((r) => {
            const m = r.member_profiles;
            if (!m) return null;
            return (
              <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg border border-border">
                <Avatar name={m.full_name} src={m.profile_photo_url ?? undefined} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{m.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.relationship_type.replace(/_/g, " ")} · strength {r.strength}/5
                  </p>
                </div>
                {r.is_follow_up_owner && <Badge label="Follow-up" color="blue"  />}
                <button
                  type="button"
                  onClick={() => removeRelationship(r.id)}
                  className="text-muted-foreground hover:text-red-500 p-1"
                  aria-label="Remove"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Suggested connections</p>
          <div className="space-y-2">
            {suggestions.slice(0, 5).map((s) => (
              <div key={s.memberId} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-1 text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{s.memberName}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.reason}</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => addRelationship(s.memberId, s.relationshipType, s.strength)}
                >
                  Add
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-border pt-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground">Add connection manually</p>
        <div className="grid sm:grid-cols-2 gap-2">
          <Select
            label="Brother"
            value={addMemberId}
            onChange={(e) => setAddMemberId(e.target.value)}
            options={[{ value: "", label: "Select member" }, ...members.map((m) => ({ value: m.id, label: m.full_name }))]}
          />
          <Select
            label="Relationship"
            value={addType}
            onChange={(e) => setAddType(e.target.value)}
            options={TYPE_OPTIONS}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            icon={<Plus size={14} />}
            disabled={!addMemberId}
            onClick={() => addRelationship(addMemberId, addType, 3)}
          >
            Add connection
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={<User size={14} />}
            disabled={!addMemberId}
            onClick={() => addRelationship(addMemberId, addType, 5, true)}
          >
            Set as follow-up owner
          </Button>
        </div>
      </div>
    </Card>
  );
}
