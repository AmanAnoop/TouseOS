"use client";

import { useState, useEffect, useCallback } from "react";
import { Gavel, Plus, Users } from "lucide-react";
import toast from "react-hot-toast";
import { usePermissions } from "@/hooks/use-permissions";
import { useOrg } from "@/hooks/use-org";
import {
  Badge, Button, Card, EmptyState, Input, Modal,
  PageHeader, Tabs, Textarea,
} from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import { DEFAULT_VOTE_OPTIONS, MEETING_TYPES, meetingTypeLabel } from "@/lib/governance-config";

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
  options: string[];
  votes: Record<string, string>;
}

export default function GovernancePage() {
  const { orgId, userId } = useOrg();
  const { can, loading: permLoading } = usePermissions();
  const [tab, setTab] = useState("meetings");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [voteOpen, setVoteOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    meetingType: "chapter_meeting",
    scheduledAt: "",
    location: "",
    agenda: "",
    quorumRequired: "0",
  });
  const [voteForm, setVoteForm] = useState({
    title: "",
    description: "",
    options: DEFAULT_VOTE_OPTIONS.join(", "),
  });
  const load = useCallback(async (oid: string) => {
    const [mRes, vRes] = await Promise.all([
      fetch(`/api/governance/meetings?org_id=${encodeURIComponent(oid)}`),
      fetch(`/api/governance/votes?org_id=${encodeURIComponent(oid)}`),
    ]);
    if (mRes.ok) setMeetings((await mRes.json()) as Meeting[]);
    if (vRes.ok) setVotes((await vRes.json()) as Vote[]);
  }, []);

  useEffect(() => {
    if (orgId) load(orgId);
  }, [orgId, load]);

  async function createMeeting() {
    if (!orgId || !form.title) return;
    const res = await fetch("/api/governance/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        title: form.title,
        meetingType: form.meetingType,
        scheduledAt: form.scheduledAt || null,
        location: form.location || null,
        agenda: form.agenda || null,
        quorumRequired: form.quorumRequired,
      }),
    });
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Failed to schedule meeting");
      return;
    }
    toast.success("Meeting scheduled");
    setMeetingOpen(false);
    setForm({
      title: "",
      meetingType: "chapter_meeting",
      scheduledAt: "",
      location: "",
      agenda: "",
      quorumRequired: "0",
    });
    load(orgId);
  }

  async function createVote() {
    if (!orgId || !voteForm.title) return;
    const res = await fetch("/api/governance/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        title: voteForm.title,
        description: voteForm.description || null,
        options: voteForm.options,
      }),
    });
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Failed to create vote");
      return;
    }
    toast.success("Vote created");
    setVoteOpen(false);
    setVoteForm({ title: "", description: "", options: DEFAULT_VOTE_OPTIONS.join(", ") });
    load(orgId);
  }

  function tallyVote(v: Vote) {
    const options = v.options ?? DEFAULT_VOTE_OPTIONS;
    const counts: Record<string, number> = Object.fromEntries(options.map((o) => [o, 0]));
    Object.values(v.votes ?? {}).forEach((choice) => {
      if (counts[choice] !== undefined) counts[choice]++;
    });
    return counts;
  }

  async function castVote(voteId: string, option: string) {
    const res = await fetch("/api/governance/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voteId, option }),
    });
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Vote failed");
      return;
    }
    toast.success("Vote recorded");
    if (orgId) load(orgId);
  }

  async function closeVote(voteId: string) {
    await fetch("/api/governance/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voteId, action: "close" }),
    });
    toast.success("Vote closed");
    if (orgId) load(orgId);
  }

  async function updateQuorum(id: string, present: number) {
    if (!orgId) return;
    await fetch("/api/governance/meetings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, orgId, quorumPresent: present }),
    });
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
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setMeetingOpen(true)} disabled={permLoading || !can("manage_org_settings")}>Schedule meeting</Button>
          </div>
        }
      />

      <Tabs tabs={[
        { id: "meetings", label: "Meetings", count: meetings.length },
        { id: "votes", label: "Votes", count: votes.length },
      ]} active={tab} onChange={setTab} />

      {tab === "meetings" && (
        meetings.length === 0 ? (
          <EmptyState icon={<Users size={24} />} title="No meetings scheduled" description="Schedule chapter meetings, standards hearings, or officer elections." action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setMeetingOpen(true)} disabled={permLoading || !can("manage_org_settings")}>Schedule meeting</Button>} />
        ) : (
          <div className="space-y-3">
            {meetings.map((m) => (
              <Card key={m.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{m.title}</p>
                      <Badge label={meetingTypeLabel(m.meeting_type)} color="gray" />
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
            {votes.map((v) => {
              const options = v.options ?? DEFAULT_VOTE_OPTIONS;
              const counts = tallyVote(v);
              const myBallot = userId ? v.votes?.[userId] : undefined;
              return (
                <Card key={v.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{v.title}</p>
                      {v.description && <p className="text-sm text-muted-foreground mt-1">{v.description}</p>}
                    </div>
                    <Badge label={v.status} color={v.status === "open" ? "blue" : "gray"} />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {options.map((opt) => (
                      <span key={opt} className="text-xs bg-surface-1 px-2 py-1 rounded border border-border">
                        {opt}: <strong>{counts[opt] ?? 0}</strong>
                      </span>
                    ))}
                  </div>
                  {v.status === "open" && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {options.map((opt) => (
                        <Button
                          key={opt}
                          size="sm"
                          variant={myBallot === opt ? "primary" : "secondary"}
                          onClick={() => castVote(v.id, opt)}
                        >
                          {opt}
                        </Button>
                      ))}
                      {can("manage_org_settings") && (
                        <Button size="sm" variant="ghost" onClick={() => closeVote(v.id)}>Close vote</Button>
                      )}
                    </div>
                  )}
                  {myBallot && <p className="text-xs text-muted-foreground mt-2">Your vote: {myBallot}</p>}
                </Card>
              );
            })}
          </div>
        )
      )}

      <Modal open={meetingOpen} onClose={() => setMeetingOpen(false)} title="Schedule meeting" footer={<><Button variant="secondary" onClick={() => setMeetingOpen(false)}>Cancel</Button><Button onClick={createMeeting}>Create</Button></>}>
        <div className="space-y-3">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Chapter meeting" />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Meeting type</label>
            <select
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
              value={form.meetingType}
              onChange={(e) => setForm({ ...form, meetingType: e.target.value })}
            >
              {MEETING_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
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
          <Input label="Options (comma-separated)" value={voteForm.options} onChange={(e) => setVoteForm({ ...voteForm, options: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
