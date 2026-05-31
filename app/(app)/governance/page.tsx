"use client";

import { useState, useEffect, useCallback } from "react";
import { Gavel, Plus, Users } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import {
  Badge, Button, Card, EmptyState, Input, Modal,
  PageHeader, Tabs, Textarea,
} from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

interface Meeting {
  id: string;
  title: string;
  meeting_type: string;
  scheduled_at: string | null;
  location: string | null;
  agenda: string | null;
  minutes: string | null;
  quorum_required: number;
  quorum_present: number;
  status: string;
}

interface Vote {
  id: string;
  title: string;
  description: string | null;
  status: string;
  votes: Record<string, number>;
}

export default function GovernancePage() {
  const supabase = createClient();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [tab, setTab] = useState("meetings");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [voteOpen, setVoteOpen] = useState(false);
  const [form, setForm] = useState({ title: "", scheduledAt: "", location: "", agenda: "", quorumRequired: "0" });
  const [voteForm, setVoteForm] = useState({ title: "", description: "" });

  const load = useCallback(async (oid: string) => {
    const [mRes, vRes] = await Promise.all([
      supabase.from("governance_meetings").select("*").eq("org_id", oid).order("scheduled_at", { ascending: false }),
      supabase.from("governance_votes").select("*").eq("org_id", oid).order("created_at", { ascending: false }),
    ]);
    setMeetings((mRes.data ?? []) as Meeting[]);
    setVotes((vRes.data ?? []) as Vote[]);
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

  async function createMeeting() {
    if (!orgId || !form.title) return;
    const { error } = await supabase.from("governance_meetings").insert({
      org_id: orgId,
      title: form.title,
      scheduled_at: form.scheduledAt || null,
      location: form.location || null,
      agenda: form.agenda || null,
      quorum_required: parseInt(form.quorumRequired, 10) || 0,
      status: "scheduled",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Meeting scheduled");
    setMeetingOpen(false);
    setForm({ title: "", scheduledAt: "", location: "", agenda: "", quorumRequired: "0" });
    load(orgId);
  }

  async function createVote() {
    if (!orgId || !voteForm.title) return;
    const { error } = await supabase.from("governance_votes").insert({
      org_id: orgId,
      title: voteForm.title,
      description: voteForm.description || null,
      status: "open",
      votes: {},
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Vote created");
    setVoteOpen(false);
    setVoteForm({ title: "", description: "" });
    load(orgId);
  }

  async function updateQuorum(id: string, present: number) {
    if (!orgId) return;
    await supabase.from("governance_meetings").update({ quorum_present: present }).eq("id", id);
    load(orgId);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Governance & Meetings"
        description="Agendas, minutes, quorum tracking, and chapter votes"
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" icon={<Gavel size={14} />} onClick={() => setVoteOpen(true)}>New vote</Button>
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setMeetingOpen(true)}>Schedule meeting</Button>
          </div>
        }
      />

      <Tabs tabs={[
        { id: "meetings", label: "Meetings", count: meetings.length },
        { id: "votes", label: "Votes", count: votes.length },
      ]} active={tab} onChange={setTab} />

      {tab === "meetings" && (
        meetings.length === 0 ? (
          <EmptyState icon={<Users size={24} />} title="No meetings scheduled" description="Schedule chapter meetings, standards hearings, or officer elections." action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setMeetingOpen(true)}>Schedule meeting</Button>} />
        ) : (
          <div className="space-y-3">
            {meetings.map((m) => (
              <Card key={m.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{m.title}</p>
                      <Badge label={m.status} color={m.status === "completed" ? "green" : "blue"} />
                    </div>
                    {m.scheduled_at && <p className="text-sm text-muted-foreground mt-1">{formatDateTime(m.scheduled_at)}{m.location ? ` · ${m.location}` : ""}</p>}
                    {m.agenda && <p className="text-sm mt-2 whitespace-pre-wrap">{m.agenda}</p>}
                    {m.quorum_required > 0 && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Quorum: {m.quorum_present}/{m.quorum_required}</span>
                        <Button size="sm" variant="secondary" onClick={() => updateQuorum(m.id, m.quorum_present + 1)}>+1 present</Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {tab === "votes" && (
        votes.length === 0 ? (
          <EmptyState icon={<Gavel size={24} />} title="No active votes" action={<Button size="sm" onClick={() => setVoteOpen(true)}>Create vote</Button>} />
        ) : (
          <div className="space-y-3">
            {votes.map((v) => (
              <Card key={v.id}>
                <p className="font-semibold">{v.title}</p>
                {v.description && <p className="text-sm text-muted-foreground mt-1">{v.description}</p>}
                <Badge label={v.status} color={v.status === "open" ? "blue" : "gray"} className="mt-2" />
              </Card>
            ))}
          </div>
        )
      )}

      <Modal open={meetingOpen} onClose={() => setMeetingOpen(false)} title="Schedule meeting" footer={<><Button variant="secondary" onClick={() => setMeetingOpen(false)}>Cancel</Button><Button onClick={createMeeting}>Create</Button></>}>
        <div className="space-y-3">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Chapter meeting" />
          <Input label="Date & time" type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
          <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <Input label="Quorum required" type="number" value={form.quorumRequired} onChange={(e) => setForm({ ...form, quorumRequired: e.target.value })} />
          <Textarea label="Agenda" value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} />
        </div>
      </Modal>

      <Modal open={voteOpen} onClose={() => setVoteOpen(false)} title="Create vote" footer={<><Button variant="secondary" onClick={() => setVoteOpen(false)}>Cancel</Button><Button onClick={createVote}>Create</Button></>}>
        <div className="space-y-3">
          <Input label="Motion / question" value={voteForm.title} onChange={(e) => setVoteForm({ ...voteForm, title: e.target.value })} />
          <Textarea label="Description" value={voteForm.description} onChange={(e) => setVoteForm({ ...voteForm, description: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
