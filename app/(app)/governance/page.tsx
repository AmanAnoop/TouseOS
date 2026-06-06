"use client";

import { useState, useEffect, useCallback } from "react";
import { Gavel, Plus, Users } from "lucide-react";
import toast from "react-hot-toast";
import { usePermissions } from "@/hooks/use-permissions";
import { useOrg } from "@/hooks/use-org";
import {
  Badge, Button, Card, EmptyState, Input, Modal,
  PageHeader, Select, Tabs, Textarea,
} from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import { DEFAULT_VOTE_OPTIONS, MEETING_TYPES, meetingTypeLabel } from "@/lib/governance-config";
import type { MemberProfile } from "@/types";

interface Meeting {
  id: string;
  title: string;
  meeting_type: string;
  scheduled_at: string | null;
  location: string | null;
  agenda: string | null;
  minutes: string | null;
  attendee_ids?: string[];
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
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [voteOpen, setVoteOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    meetingType: "chapter_meeting",
    scheduledAt: "",
    location: "",
    agenda: "",
    attendeeIds: [] as string[],
  });
  const [voteForm, setVoteForm] = useState({ title: "", description: "" });

  const load = useCallback(async (oid: string) => {
    const [mRes, vRes, memRes] = await Promise.all([
      fetch(`/api/governance/meetings?org_id=${encodeURIComponent(oid)}`),
      fetch(`/api/governance/votes?org_id=${encodeURIComponent(oid)}`),
      fetch(`/api/members?org_id=${encodeURIComponent(oid)}`),
    ]);
    if (mRes.ok) setMeetings((await mRes.json()) as Meeting[]);
    if (vRes.ok) setVotes((await vRes.json()) as Vote[]);
    if (memRes.ok) setMembers((await memRes.json()) as MemberProfile[]);
  }, []);

  useEffect(() => {
    if (orgId) load(orgId);
  }, [orgId, load]);

  function toggleAttendee(memberId: string) {
    setForm((f) => ({
      ...f,
      attendeeIds: f.attendeeIds.includes(memberId)
        ? f.attendeeIds.filter((id) => id !== memberId)
        : [...f.attendeeIds, memberId],
    }));
  }

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
        attendeeIds: form.attendeeIds,
      }),
    });
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Failed to schedule meeting");
      return;
    }
    toast.success("Meeting scheduled");
    setMeetingOpen(false);
    setForm({ title: "", meetingType: "chapter_meeting", scheduledAt: "", location: "", agenda: "", attendeeIds: [] });
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
        options: DEFAULT_VOTE_OPTIONS.join(", "),
      }),
    });
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Failed to create vote");
      return;
    }
    toast.success("Vote created");
    setVoteOpen(false);
    setVoteForm({ title: "", description: "" });
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

  return (
    <div className="space-y-5">
      <PageHeader
        title="Governance & Meetings"
        description="Agendas, minutes, attendee tracking, and chapter votes"
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
            {meetings.map((m) => {
              const attendeeIds = m.attendee_ids ?? [];
              const attendeeNames = attendeeIds
                .map((id) => members.find((mem) => mem.id === id)?.full_name)
                .filter(Boolean);
              return (
                <Card key={m.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{m.title}</p>
                        <Badge label={meetingTypeLabel(m.meeting_type)} color="purple" />
                        <Badge label={m.status} color={m.status === "completed" ? "green" : "blue"} />
                      </div>
                      {m.scheduled_at && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDateTime(m.scheduled_at)}{m.location ? ` · ${m.location}` : ""}
                        </p>
                      )}
                      {m.agenda && <p className="text-sm mt-2 whitespace-pre-wrap">{m.agenda}</p>}
                      {attendeeNames.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">
                            Attendees ({attendeeNames.length})
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {attendeeNames.map((name) => (
                              <Badge key={name} label={name!} color="gray" />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
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
              const totalVotes = Object.values(counts).reduce((a, b) => a + b, 0);
              const leading = options.reduce((best, opt) =>
                (counts[opt] ?? 0) > (counts[best] ?? 0) ? opt : best, options[0]);
              return (
                <Card key={v.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{v.title}</p>
                      {v.description && <p className="text-sm text-muted-foreground mt-1">{v.description}</p>}
                    </div>
                    <Badge label={v.status} color={v.status === "open" ? "blue" : "gray"} />
                  </div>
                  <div className="mt-3 space-y-2">
                    {options.map((opt) => {
                      const count = counts[opt] ?? 0;
                      const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                      return (
                        <div key={opt}>
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className={opt === leading && v.status === "closed" ? "font-semibold" : ""}>{opt}</span>
                            <span className="text-muted-foreground">{count} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-greek-500 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
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

      <Modal open={meetingOpen} onClose={() => setMeetingOpen(false)} title="Schedule meeting" size="lg" footer={<><Button variant="secondary" onClick={() => setMeetingOpen(false)}>Cancel</Button><Button onClick={createMeeting}>Create</Button></>}>
        <div className="space-y-3">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Chapter meeting" />
          <Select
            label="Meeting type"
            value={form.meetingType}
            onChange={(e) => setForm({ ...form, meetingType: e.target.value })}
            options={MEETING_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          />
          <Input label="Date & time" type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
          <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <Textarea label="Agenda" value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} />
          <div>
            <label className="text-sm font-medium block mb-2">Expected attendees</label>
            <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
              {members.filter((m) => m.membership_status === "active").map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer p-1.5 rounded hover:bg-surface-1">
                  <input
                    type="checkbox"
                    checked={form.attendeeIds.includes(m.id)}
                    onChange={() => toggleAttendee(m.id)}
                  />
                  <span>{m.full_name}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{form.attendeeIds.length} member{form.attendeeIds.length !== 1 ? "s" : ""} selected</p>
          </div>
        </div>
      </Modal>

      <Modal open={voteOpen} onClose={() => setVoteOpen(false)} title="Create vote" footer={<><Button variant="secondary" onClick={() => setVoteOpen(false)}>Cancel</Button><Button onClick={createVote}>Create</Button></>}>
        <div className="space-y-3">
          <Input label="Motion / question" value={voteForm.title} onChange={(e) => setVoteForm({ ...voteForm, title: e.target.value })} placeholder="Approve spring social budget?" />
          <Textarea label="Description (optional)" value={voteForm.description} onChange={(e) => setVoteForm({ ...voteForm, description: e.target.value })} />
          <p className="text-xs text-muted-foreground">Members vote Yes, No, or Abstain.</p>
        </div>
      </Modal>
    </div>
  );
}
