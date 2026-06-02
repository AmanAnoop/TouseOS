"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Vote } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import {
  Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Textarea,
} from "@/components/ui";
import { can, type RoleName } from "@/lib/permissions";
import { isClubOrg } from "@/lib/utils";

interface Candidate {
  id: string;
  display_name: string;
  statement: string | null;
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
  const supabase = createClient();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgType, setOrgType] = useState("");
  const [role, setRole] = useState<RoleName>("general_member");
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [candidateOpen, setCandidateOpen] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", position: "", description: "" });
  const [candidateForm, setCandidateForm] = useState({ displayName: "", statement: "" });

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const res = await fetch(`/api/club/elections?org_id=${oid}`);
    const data = await res.json();
    if (res.ok) setElections(data.elections ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: m } = await supabase
        .from("org_members")
        .select("org_id, role, organizations(type)")
        .eq("user_id", user.id)
        .limit(1)
        .single();
      if (m) {
        const type = String(((m.organizations as unknown) as Record<string, unknown>)?.type ?? "");
        setOrgId(m.org_id);
        setOrgType(type);
        setRole(String(m.role) as RoleName);
        if (isClubOrg(type)) load(m.org_id);
        else setLoading(false);
      }
    }
    init();
  }, [supabase, load]);

  const canManage = can(role, "manage_org_settings");

  async function createElection() {
    if (!orgId || !form.title || !form.position) return;
    const res = await fetch("/api/club/elections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, ...form }),
    });
    if (res.ok) {
      toast.success("Election created");
      setCreateOpen(false);
      setForm({ title: "", position: "", description: "" });
      load(orgId);
    }
  }

  async function addCandidate() {
    if (!orgId || !candidateOpen || !candidateForm.displayName) return;
    const res = await fetch("/api/club/elections/candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        electionId: candidateOpen,
        displayName: candidateForm.displayName,
        statement: candidateForm.statement,
      }),
    });
    if (res.ok) {
      toast.success("Candidate added");
      setCandidateOpen(null);
      setCandidateForm({ displayName: "", statement: "" });
      load(orgId);
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
    return <PageHeader title="Officer elections" description="ClubOS feature for student organizations." />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Officer elections"
        description="Run leadership votes for president, treasurer, committee chairs, and more"
        action={
          canManage ? (
            <Button size="sm" className="bg-club-600 hover:bg-club-700 officer-touch" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
              New election
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="h-40 rounded-xl bg-surface-2 animate-pulse" />
      ) : elections.length === 0 ? (
        <EmptyState icon={<Vote size={24} />} title="No elections" description="Create an election when it's time to elect officers." />
      ) : (
        <div className="space-y-4">
          {elections.map((e) => (
            <Card key={e.id}>
              <div className="flex items-start justify-between gap-2 flex-wrap mb-3">
                <div>
                  <h3 className="font-semibold">{e.title}</h3>
                  <p className="text-sm text-muted-foreground">{e.position}</p>
                </div>
                <Badge label={e.status} color={e.status === "open" ? "green" : "gray"} />
              </div>
              {e.description && <p className="text-sm mb-3">{e.description}</p>}
              {e.candidates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No candidates yet.</p>
              ) : (
                <div className="space-y-2">
                  {e.candidates.map((c) => (
                    <div key={c.id} className="flex items-start justify-between gap-3 p-2 rounded-lg border border-border">
                      <div>
                        <p className="font-medium text-sm">{c.display_name}</p>
                        {c.statement && <p className="text-xs text-muted-foreground mt-0.5">{c.statement}</p>}
                        <p className="text-xs text-club-600 mt-1">{c.votes} vote{c.votes !== 1 ? "s" : ""}</p>
                      </div>
                      {e.status === "open" && (
                        <Button
                          size="sm"
                          variant={e.myVoteCandidateId === c.id ? "primary" : "secondary"}
                          className={e.myVoteCandidateId === c.id ? "bg-club-600 hover:bg-club-700" : ""}
                          onClick={() => castVote(e.id, c.id)}
                        >
                          {e.myVoteCandidateId === c.id ? "Your vote" : "Vote"}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {canManage && e.status === "open" && (
                <Button variant="secondary" size="sm" className="mt-3" onClick={() => setCandidateOpen(e.id)}>
                  Add candidate
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New election" footer={<><Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button><Button className="bg-club-600 hover:bg-club-700" onClick={createElection}>Create</Button></>}>
        <div className="space-y-3">
          <Input label="Election title" placeholder="Spring 2026 officer elections" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input label="Position" placeholder="President" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
      </Modal>

      <Modal open={Boolean(candidateOpen)} onClose={() => setCandidateOpen(null)} title="Add candidate" footer={<><Button variant="secondary" onClick={() => setCandidateOpen(null)}>Cancel</Button><Button className="bg-club-600 hover:bg-club-700" onClick={addCandidate}>Add</Button></>}>
        <div className="space-y-3">
          <Input label="Name" value={candidateForm.displayName} onChange={(e) => setCandidateForm({ ...candidateForm, displayName: e.target.value })} />
          <Textarea label="Statement" value={candidateForm.statement} onChange={(e) => setCandidateForm({ ...candidateForm, statement: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
