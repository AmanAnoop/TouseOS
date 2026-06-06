"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Vote } from "lucide-react";
import toast from "react-hot-toast";
import { useOrg } from "@/hooks/use-org";
import {
  Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, Skeleton, Textarea,
} from "@/components/ui";
import { can } from "@/lib/permissions";
import { isClubOrg } from "@/lib/utils";
import type { MemberProfile } from "@/types";

const POSITION_OPTIONS = [
  { value: "President", label: "President" },
  { value: "Vice President", label: "Vice President" },
  { value: "Treasurer", label: "Treasurer" },
  { value: "Secretary", label: "Secretary" },
  { value: "Philanthropy Chair", label: "Philanthropy Chair" },
  { value: "Events Chair", label: "Events Chair" },
  { value: "Membership Chair", label: "Membership Chair" },
  { value: "Social Chair", label: "Social Chair" },
  { value: "Other", label: "Other (custom)" },
];

interface Candidate {
  id: string;
  display_name: string;
  statement: string | null;
  member_id: string | null;
  votes: number;
}

interface Election {
  id: string;
  title: string;
  position: string;
  description: string | null;
  status: string;
  candidates: Candidate[];
  myVoteCandidateId: string | null;
}

export default function ClubElectionsPage() {
  const { orgId, orgType, role } = useOrg();
  const [elections, setElections] = useState<Election[]>([]);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [candidateOpen, setCandidateOpen] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", position: "President", positionCustom: "", description: "" });
  const [candidateForm, setCandidateForm] = useState({ memberId: "", displayName: "", statement: "" });

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const [elecRes, membersRes] = await Promise.all([
      fetch(`/api/club/elections?org_id=${oid}`),
      fetch(`/api/members?org_id=${encodeURIComponent(oid)}`),
    ]);
    const data = await elecRes.json();
    if (elecRes.ok) setElections(data.elections ?? []);
    if (membersRes.ok) setMembers((await membersRes.json()) as MemberProfile[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!orgId) return;
    if (isClubOrg(orgType)) load(orgId);
    else setLoading(false);
  }, [orgId, orgType, load]);

  const canManage = can(role, "manage_org_settings");
  const canAddCandidates = can(role, "edit_roster") || canManage;

  const resolvedPosition =
    form.position === "Other" ? form.positionCustom.trim() : form.position;

  async function createElection() {
    if (!orgId || !form.title || !resolvedPosition) {
      toast.error("Title and position are required");
      return;
    }
    const res = await fetch("/api/club/elections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        title: form.title,
        position: resolvedPosition,
        description: form.description,
        status: "open",
      }),
    });
    if (res.ok) {
      toast.success("Election created");
      setCreateOpen(false);
      setForm({ title: "", position: "President", positionCustom: "", description: "" });
      load(orgId);
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Create failed");
    }
  }

  async function updateElectionStatus(id: string, status: string) {
    if (!orgId) return;
    const res = await fetch("/api/club/elections", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, id, status }),
    });
    if (res.ok) {
      toast.success(status === "closed" ? "Election closed" : "Election updated");
      load(orgId);
    }
  }

  async function addCandidate() {
    if (!orgId || !candidateOpen) return;
    const member = members.find((m) => m.id === candidateForm.memberId);
    const displayName = candidateForm.displayName.trim() || member?.full_name;
    if (!displayName) {
      toast.error("Select a member or enter a name");
      return;
    }
    const res = await fetch("/api/club/elections/candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        electionId: candidateOpen,
        memberId: candidateForm.memberId || null,
        displayName,
        statement: candidateForm.statement,
      }),
    });
    if (res.ok) {
      toast.success("Candidate added");
      setCandidateOpen(null);
      setCandidateForm({ memberId: "", displayName: "", statement: "" });
      load(orgId);
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Failed to add candidate");
    }
  }

  async function castVote(electionId: string, candidateId: string) {
    if (!orgId) return;
    const res = await fetch("/api/club/elections/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, electionId, candidateId }),
    });
    if (res.ok) {
      toast.success("Vote recorded");
      load(orgId);
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Vote failed");
    }
  }

  if (!loading && orgType && !isClubOrg(orgType)) {
    return <PageHeader title="Officer elections" description="Run officer elections for your student organization." />;
  }

  return (
    <div className="ds-page-stack">
      <PageHeader
        title="Officer elections"
        description="Run leadership votes for president, treasurer, philanthropy chair, and more"
        action={
          canManage ? (
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
              New election
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} style={{ height: 120, width: "100%" }} />
          ))}
        </div>
      ) : elections.length === 0 ? (
        <EmptyState
          icon={<Vote size={24} />}
          title="No elections"
          description="Create an election when it's time to elect officers."
          action={canManage ? <Button size="sm" onClick={() => setCreateOpen(true)}>New election</Button> : undefined}
        />
      ) : (
        <div className="space-y-4">
          {elections.map((e) => (
            <Card key={e.id}>
              <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                <div>
                  <h3 className="type-h2" style={{ margin: 0, fontSize: 16 }}>{e.title}</h3>
                  <p className="text-sm text-muted-foreground">{e.position}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge label={e.status} color={e.status === "open" ? "green" : e.status === "closed" ? "gray" : "yellow"} />
                  {canManage && e.status === "open" && (
                    <Button variant="secondary" size="sm" onClick={() => updateElectionStatus(e.id, "closed")}>
                      Close election
                    </Button>
                  )}
                  {canManage && e.status === "closed" && (
                    <Button variant="secondary" size="sm" onClick={() => updateElectionStatus(e.id, "open")}>
                      Reopen
                    </Button>
                  )}
                </div>
              </div>
              {e.description && <p className="text-sm text-muted-foreground mb-3">{e.description}</p>}
              {e.candidates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No candidates yet.</p>
              ) : (
                <div className="space-y-2">
                  {e.candidates.map((c) => (
                    <div key={c.id} className="flex items-start justify-between gap-4 p-3 rounded-lg border border-border">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground">{c.display_name}</p>
                        {c.statement && <p className="text-xs text-muted-foreground mt-1">{c.statement}</p>}
                        <p className="text-xs text-muted-foreground mt-1">{c.votes} vote{c.votes !== 1 ? "s" : ""}</p>
                      </div>
                      {e.status === "open" && (
                        <Button
                          size="sm"
                          variant={e.myVoteCandidateId === c.id ? "primary" : "secondary"}
                          onClick={() => castVote(e.id, c.id)}
                        >
                          {e.myVoteCandidateId === c.id ? "Your vote" : "Vote"}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {canAddCandidates && e.status === "open" && (
                <Button variant="secondary" size="sm" className="mt-3" onClick={() => setCandidateOpen(e.id)}>
                  Add candidate
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New election"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createElection}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Election title"
            placeholder="Spring 2026 officer elections"
            value={form.title}
            onChange={(ev) => setForm({ ...form, title: ev.target.value })}
          />
          <Select
            label="Position"
            value={form.position}
            onChange={(ev) => setForm({ ...form, position: ev.target.value })}
            options={POSITION_OPTIONS}
          />
          {form.position === "Other" && (
            <Input
              label="Custom position"
              value={form.positionCustom}
              onChange={(ev) => setForm({ ...form, positionCustom: ev.target.value })}
            />
          )}
          <Textarea
            label="Description"
            value={form.description}
            onChange={(ev) => setForm({ ...form, description: ev.target.value })}
          />
        </div>
      </Modal>

      <Modal
        open={Boolean(candidateOpen)}
        onClose={() => setCandidateOpen(null)}
        title="Add candidate"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCandidateOpen(null)}>Cancel</Button>
            <Button onClick={addCandidate}>Add</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Roster member"
            value={candidateForm.memberId}
            onChange={(ev) => {
              const id = ev.target.value;
              const m = members.find((x) => x.id === id);
              setCandidateForm({
                ...candidateForm,
                memberId: id,
                displayName: m?.full_name ?? candidateForm.displayName,
              });
            }}
            options={members.map((m) => ({ value: m.id, label: m.full_name }))}
            placeholder="Select from roster"
          />
          <Input
            label="Display name"
            value={candidateForm.displayName}
            onChange={(ev) => setCandidateForm({ ...candidateForm, displayName: ev.target.value })}
          />
          <Textarea
            label="Statement"
            value={candidateForm.statement}
            onChange={(ev) => setCandidateForm({ ...candidateForm, statement: ev.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}
