"use client";

import { useState, useEffect, useCallback } from "react";
import { Gavel, Plus, Users, X } from "lucide-react";
import toast from "react-hot-toast";
import { usePermissions } from "@/hooks/use-permissions";
import { useOrg } from "@/hooks/use-org";
import {
  Badge, Button, Card, EmptyState, Input, Modal,
  PageHeader, Select, Tabs, Textarea,
} from "@/components/ui";
import { AddressAutocomplete } from "@/components/location/address-autocomplete";
import { formatDateTime } from "@/lib/utils";
import {
  DEFAULT_VOTE_OPTIONS,
  EXPECTED_ATTENDEE_GROUPS,
  MEETING_TYPES,
  meetingTypeLabel,
} from "@/lib/governance-config";

interface Meeting {
  id: string;
  title: string;
  meeting_type: string;
  scheduled_at: string | null;
  location: string | null;
  agenda: string | null;
  minutes: string | null;
  status: string;
  expected_attendee_group?: string | null;
  attendee_ids?: string[] | null;
}

interface Vote {
  id: string;
  title: string;
  description: string | null;
  status: string;
  options: string[];
  votes: Record<string, string>;
  deadline?: string | null;
}

interface MemberOption {
  id: string;
  full_name: string;
}

export default function GovernancePage() {
  const { orgId, userId, loading: orgLoading } = useOrg();
  const { can, loading: permLoading } = usePermissions();
  const [tab, setTab] = useState("meetings");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [voteOpen, setVoteOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    meetingType: "chapter",
    scheduledAt: "",
    location: "",
    agenda: "",
    expectedAttendeeGroup: "all_members",
    attendeeIds: [] as string[],
    memberSearch: "",
  });
  const [voteForm, setVoteForm] = useState({
    title: "",
    voterGroup: "all_members",
    voteType: "yes_no" as "yes_no" | "multiple_choice",
    options: ["", ""] as string[],
    deadline: "",
  });

  const load = useCallback(async (oid: string) => {
    const [mRes, vRes, memRes] = await Promise.all([
      fetch(`/api/governance/meetings?org_id=${encodeURIComponent(oid)}`),
      fetch(`/api/governance/votes?org_id=${encodeURIComponent(oid)}`),
      fetch(`/api/members?org_id=${encodeURIComponent(oid)}&scope=roster`),
    ]);
    if (mRes.ok) setMeetings((await mRes.json()) as Meeting[]);
    if (vRes.ok) setVotes((await vRes.json()) as Vote[]);
    if (memRes.ok) {
      const list = (await memRes.json()) as Array<{ id: string; full_name: string }>;
      setMembers(list.map((m) => ({ id: m.id, full_name: m.full_name })));
    }
  }, []);

  useEffect(() => {
    if (orgLoading) return;
    if (orgId) load(orgId);
  }, [orgId, orgLoading, load]);

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
        expectedAttendeeGroup: form.expectedAttendeeGroup,
        attendeeIds: form.expectedAttendeeGroup === "specific" ? form.attendeeIds : [],
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
      meetingType: "chapter",
      scheduledAt: "",
      location: "",
      agenda: "",
      expectedAttendeeGroup: "all_members",
      attendeeIds: [],
      memberSearch: "",
    });
    load(orgId);
  }

  async function createVote() {
    if (!orgId || !voteForm.title.trim()) return;
    const options = voteForm.voteType === "yes_no"
      ? DEFAULT_VOTE_OPTIONS.filter((o) => o !== "Abstain").slice(0, 2)
      : voteForm.options.map((o) => o.trim()).filter(Boolean);

    if (options.length < 2) {
      toast.error("Add at least two options for a multiple-choice vote");
      return;
    }

    const res = await fetch("/api/governance/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        title: voteForm.title,
        options,
        voterGroup: voteForm.voterGroup,
        deadline: voteForm.deadline || null,
      }),
    });
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Failed to create vote");
      return;
    }
    toast.success("Vote created");
    setVoteOpen(false);
    setVoteForm({
      title: "",
      voterGroup: "all_members",
      voteType: "yes_no",
      options: ["", ""],
      deadline: "",
    });
    load(orgId);
  }

  function tallyVote(v: Vote) {
    const options = v.options ?? DEFAULT_VOTE_OPTIONS;
    const counts: Record<string, number> = Object.fromEntries(options.map((o) => [o, 0]));
    Object.values(v.votes ?? {}).forEach((choice) => {
      if (counts[choice] !== undefined) counts[choice]++;
    });
    const total = Object.values(counts).reduce((s, n) => s + n, 0) || 1;
    return { counts, total };
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

  const filteredMembers = members.filter((m) =>
    m.full_name.toLowerCase().includes(form.memberSearch.trim().toLowerCase()),
  ).slice(0, 8);

  function expectedAttendeesLabel(group?: string | null) {
    return EXPECTED_ATTENDEE_GROUPS.find((g) => g.value === group)?.label ?? "All Members";
  }

  return (
    <div className="ds-page-stack">
      <PageHeader
        title="Governance & Meetings"
        description="Agendas, minutes, expected attendance, and chapter votes"
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
                    {m.scheduled_at && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatDateTime(m.scheduled_at)}{m.location ? ` · ${m.location}` : ""}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Expected attendees: {expectedAttendeesLabel(m.expected_attendee_group)}
                      {m.expected_attendee_group === "specific" && Array.isArray(m.attendee_ids) && m.attendee_ids.length > 0
                        ? ` (${m.attendee_ids.length} selected)`
                        : ""}
                    </p>
                    {m.agenda && <p className="text-sm mt-2 whitespace-pre-wrap">{m.agenda}</p>}
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
              const { counts, total } = tallyVote(v);
              const myBallot = userId ? v.votes?.[userId] : undefined;
              return (
                <Card key={v.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{v.title}</p>
                      {v.deadline && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Deadline: {formatDateTime(v.deadline)}
                        </p>
                      )}
                    </div>
                    <Badge label={v.status} color={v.status === "open" ? "blue" : "gray"} />
                  </div>
                  <div className="ds-page-stack" style={{ gap: 8, marginTop: 12 }}>
                    {options.map((opt) => {
                      const count = counts[opt] ?? 0;
                      const pct = Math.round((count / total) * 100);
                      return (
                        <div key={opt}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span className="type-small">{opt}</span>
                            <span className="type-small" style={{ fontFamily: "var(--font-mono)" }}>{count} ({pct}%)</span>
                          </div>
                          <div style={{ height: 8, background: "var(--color-bg-subtle)", borderRadius: 4, overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${pct}%`,
                                height: "100%",
                                background: "color-mix(in srgb, var(--color-org-primary) 60%, transparent)",
                                borderRadius: 4,
                              }}
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

      <Modal open={meetingOpen} onClose={() => setMeetingOpen(false)} title="Schedule meeting" footer={<><Button variant="secondary" onClick={() => setMeetingOpen(false)}>Cancel</Button><Button onClick={createMeeting}>Create</Button></>}>
        <div className="space-y-3">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Chapter meeting" />
          <Select
            label="Meeting type"
            value={form.meetingType}
            onChange={(e) => setForm({ ...form, meetingType: e.target.value })}
            options={MEETING_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          />
          <Input label="Date & time" type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
          <AddressAutocomplete
            label="Location"
            value={form.location}
            onSelect={({ address }) => setForm({ ...form, location: address })}
            placeholder="Search venues, buildings, or addresses…"
          />
          <Select
            label="Expected attendees"
            value={form.expectedAttendeeGroup}
            onChange={(e) => setForm({ ...form, expectedAttendeeGroup: e.target.value, attendeeIds: [] })}
            options={EXPECTED_ATTENDEE_GROUPS.map((g) => ({ value: g.value, label: g.label }))}
          />
          {form.expectedAttendeeGroup === "specific" && (
            <div className="ds-field">
              <Input
                label="Search members"
                value={form.memberSearch}
                onChange={(e) => setForm({ ...form, memberSearch: e.target.value })}
                placeholder="Type a name…"
              />
              {filteredMembers.length > 0 && (
                <ul className="ds-autocomplete-list" style={{ position: "relative" }}>
                  {filteredMembers.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        className="ds-autocomplete-item"
                        onClick={() => {
                          if (!form.attendeeIds.includes(m.id)) {
                            setForm({ ...form, attendeeIds: [...form.attendeeIds, m.id] });
                          }
                        }}
                      >
                        {m.full_name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {form.attendeeIds.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  {form.attendeeIds.map((id) => {
                    const member = members.find((x) => x.id === id);
                    return (
                      <span key={id} className="ds-chip" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {member?.full_name ?? "Member"}
                        <button
                          type="button"
                          aria-label={`Remove ${member?.full_name}`}
                          onClick={() => setForm({ ...form, attendeeIds: form.attendeeIds.filter((x) => x !== id) })}
                          style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0 }}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          <Textarea label="Agenda" value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} />
        </div>
      </Modal>

      <Modal open={voteOpen} onClose={() => setVoteOpen(false)} title="Create vote" footer={<><Button variant="secondary" onClick={() => setVoteOpen(false)}>Cancel</Button><Button onClick={createVote}>Create vote</Button></>}>
        <div className="space-y-3">
          <Textarea
            label="Motion / question"
            value={voteForm.title}
            onChange={(e) => setVoteForm({ ...voteForm, title: e.target.value })}
            rows={3}
          />
          <Select
            label="Voter group"
            value={voteForm.voterGroup}
            onChange={(e) => setVoteForm({ ...voteForm, voterGroup: e.target.value })}
            options={EXPECTED_ATTENDEE_GROUPS.map((g) => ({ value: g.value, label: g.label }))}
          />
          <div className="ds-field">
            <span className="type-label">Vote type</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className={`ds-segment ${voteForm.voteType === "yes_no" ? "ds-segment-active" : ""}`}
                onClick={() => setVoteForm({ ...voteForm, voteType: "yes_no" })}
              >
                Yes / No
              </button>
              <button
                type="button"
                className={`ds-segment ${voteForm.voteType === "multiple_choice" ? "ds-segment-active" : ""}`}
                onClick={() => setVoteForm({ ...voteForm, voteType: "multiple_choice" })}
              >
                Multiple choice
              </button>
            </div>
          </div>
          {voteForm.voteType === "multiple_choice" && (
            <div className="space-y-2">
              <span className="type-label">Options</span>
              {voteForm.options.map((opt, i) => (
                <div key={i} style={{ display: "flex", gap: 8 }}>
                  <input
                    className="ds-input"
                    value={opt}
                    placeholder={`Option ${i + 1}`}
                    onChange={(e) => {
                      const next = [...voteForm.options];
                      next[i] = e.target.value;
                      setVoteForm({ ...voteForm, options: next });
                    }}
                  />
                  {voteForm.options.length > 2 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setVoteForm({
                        ...voteForm,
                        options: voteForm.options.filter((_, j) => j !== i),
                      })}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setVoteForm({ ...voteForm, options: [...voteForm.options, ""] })}
              >
                Add option
              </Button>
            </div>
          )}
          <Input
            label="Deadline"
            type="datetime-local"
            value={voteForm.deadline}
            onChange={(e) => setVoteForm({ ...voteForm, deadline: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}
