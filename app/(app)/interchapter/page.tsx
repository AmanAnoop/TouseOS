"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowRight, Calendar, CheckCircle, ChevronRight,
  Lightbulb, MessageSquare, Plus, Share2, ThumbsUp, Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/hooks/use-org";
import {
  Alert, Badge, Button, Card, EmptyState,
  Modal, Input, PageHeader, Select, StatCard, Tabs, Textarea,
} from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { AvailabilityMatcher, type AvailabilityEntry } from "@/components/interchapter/availability-matcher";
import { JointBudgetSplitter } from "@/components/interchapter/joint-budget-splitter";
import { InterchapterSummaryPanel } from "@/components/interchapter/interchapter-summary-panel";
import { InterchapterMessagesPanel } from "@/components/interchapter/interchapter-messages-panel";

interface Proposal {
  id: string;
  proposing_org_id: string;
  target_org_id: string;
  event_name: string;
  event_type: string;
  proposed_dates: Array<{ date: string }>;
  estimated_attendance: number | null;
  theme_ideas: string | null;
  venue_ideas: string | null;
  budget_estimate: number | null;
  cost_split_proposal: string | null;
  risk_level: string;
  alcohol: boolean;
  philanthropy_beneficiary: string | null;
  status: string;
  response_message: string | null;
  created_at: string;
}

interface Idea {
  id: string;
  org_id: string;
  poster_name: string | null;
  title: string;
  description: string | null;
  idea_type: string;
  estimated_cost: number | null;
  risk_level: string;
  upvotes: number;
  created_at: string;
}

export default function InterchapterPage() {
  const supabase = createClient();
  const [tab, setTab] = useState("proposals");
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const { orgId, orgType, userId } = useOrg();
  const [proposeOpen, setProposeOpen] = useState(false);
  const [ideaOpen, setIdeaOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [availability, setAvailability] = useState<AvailabilityEntry[]>([]);
  const [userName, setUserName] = useState("");
  const [partnerOrgs, setPartnerOrgs] = useState<Array<{ id: string; name: string }>>([]);
  const [targetOrgSearch, setTargetOrgSearch] = useState("");
  const [greekOrgs, setGreekOrgs] = useState<Array<{ id: string; name: string; campus: string | null }>>([]);

  const [proposalForm, setProposalForm] = useState({
    targetOrgId: "", eventName: "", eventType: "mixer",
    estimatedAttendance: "", themeIdeas: "", venueIdeas: "",
    budgetEstimate: "", costSplitProposal: "50/50",
    transportationNeeds: "", alcohol: false,
    riskLevel: "low", philanthropyBeneficiary: "",
  });

  const [ideaForm, setIdeaForm] = useState({
    title: "", description: "", ideaType: "mixer",
    estimatedCost: "", riskLevel: "low",
  });

  const load = useCallback(async (oid: string) => {
    const [propRes, ideaRes] = await Promise.all([
      fetch(`/api/interchapter/proposals?org_id=${encodeURIComponent(oid)}`),
      fetch("/api/interchapter/ideas"),
    ]);
    if (propRes.ok) setProposals((await propRes.json()) as Proposal[]);
    if (ideaRes.ok) setIdeas((await ideaRes.json()) as Idea[]);
  }, []);

  const loadAvailability = useCallback(async (oid: string) => {
    const res = await fetch(`/api/interchapter/availability?org_id=${oid}`);
    if (res.ok) setAvailability(await res.json());
  }, []);

  async function saveAvailability(dates: string[], notes: string) {
    if (!orgId) return;
    const res = await fetch("/api/interchapter/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, availableDates: dates, notes, memberName: userName }),
    });
    if (!res.ok) throw new Error("save failed");
    loadAvailability(orgId);
  }

  useEffect(() => {
    if (!orgId) return;
    load(orgId);
    loadAvailability(orgId);
  }, [orgId, load, loadAvailability]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", userId).single();
      if (prof) setUserName(String(prof.full_name));
    })();
  }, [userId, supabase]);

  useEffect(() => {
    if (!orgId || proposals.length === 0) {
      setPartnerOrgs([]);
      return;
    }
    const ids = new Set(
      proposals.flatMap((p) => {
        if (p.proposing_org_id === orgId) return [p.target_org_id];
        if (p.target_org_id === orgId) return [p.proposing_org_id];
        return [];
      }),
    );
    if (ids.size === 0) return;
    fetch(`/api/interchapter/orgs?exclude_org_id=${encodeURIComponent(orgId)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: Array<{ id: string; name: string }>) =>
        setPartnerOrgs(list.filter((o) => ids.has(o.id))),
      );
  }, [proposals, orgId]);

  useEffect(() => {
    if (!proposeOpen || !orgId) return;
    const timer = setTimeout(() => {
      const q = targetOrgSearch.trim();
      fetch(
        `/api/interchapter/orgs?exclude_org_id=${encodeURIComponent(orgId)}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
      )
        .then((r) => (r.ok ? r.json() : []))
        .then((list) => setGreekOrgs(list as Array<{ id: string; name: string; campus: string | null }>));
    }, 250);
    return () => clearTimeout(timer);
  }, [proposeOpen, orgId, targetOrgSearch]);

  async function submitProposal() {
    if (!orgId || !proposalForm.eventName || !proposalForm.targetOrgId) return;
    const res = await fetch("/api/interchapter/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        targetOrgId: proposalForm.targetOrgId,
        eventName: proposalForm.eventName,
        eventType: proposalForm.eventType,
        estimatedAttendance: proposalForm.estimatedAttendance,
        themeIdeas: proposalForm.themeIdeas,
        venueIdeas: proposalForm.venueIdeas,
        budgetEstimate: proposalForm.budgetEstimate,
        costSplitProposal: proposalForm.costSplitProposal,
        alcohol: proposalForm.alcohol,
        riskLevel: proposalForm.riskLevel,
        philanthropyBeneficiary: proposalForm.philanthropyBeneficiary,
        proposedDates: [],
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error((data as { error?: string }).error ?? "Failed");
      return;
    }
    toast.success("Proposal sent!");
    setProposeOpen(false);
    load(orgId);
  }

  async function postIdea() {
    if (!orgId || !ideaForm.title) return;
    const res = await fetch("/api/interchapter/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        title: ideaForm.title,
        description: ideaForm.description,
        ideaType: ideaForm.ideaType,
        estimatedCost: ideaForm.estimatedCost,
        riskLevel: ideaForm.riskLevel,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error((data as { error?: string }).error ?? "Failed");
      return;
    }
    toast.success("Idea posted!");
    setIdeaOpen(false);
    setIdeaForm({ title: "", description: "", ideaType: "mixer", estimatedCost: "", riskLevel: "low" });
    load(orgId);
  }

  async function respondToProposal(id: string, status: string) {
    if (!orgId) return;
    const proposal = proposals.find((p) => p.id === id);
    const res = await fetch("/api/interchapter/proposals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, orgId, status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error((data as { error?: string }).error ?? "Update failed");
      return;
    }
    setProposals((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
    if (status === "accepted" && proposal && orgId) {
      const res = await fetch("/api/interchapter/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: id,
          title: proposal.event_name,
          orgIds: [proposal.proposing_org_id, proposal.target_org_id],
        }),
      });
      if (res.ok) {
        const { workspace } = await res.json();
        toast.success("Workspace created!");
        if (workspace?.id) window.location.href = `/interchapter/workspace/${workspace.id}`;
        return;
      }
    }
    toast.success(`Proposal ${status}`);
    setSelectedProposal(null);
  }

  async function upvoteIdea(id: string) {
    if (!orgId) return;
    const res = await fetch("/api/interchapter/ideas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, orgId }),
    });
    if (res.ok) {
      const updated = await res.json();
      setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, upvotes: updated.upvotes } : i)));
    }
  }

  const incoming = proposals.filter((p) => p.target_org_id === orgId && p.status === "pending");
  const sent = proposals.filter((p) => p.proposing_org_id === orgId);

  const isGreek = orgType === "fraternity" || orgType === "sorority";

  if (!isGreek) {
    return (
      <div className="space-y-5">
        <PageHeader title="ExecLink" description="Interchapter coordination for Greek organizations" />
        <Alert type="info" title="ExecLink is for Greek organizations" description="This feature is available for fraternities and sororities to coordinate events with other chapters." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb="ExecLink"
        title="Touse Exchange"
        description="Coordinate mixers, philanthropy, and events with other chapters"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" icon={<Lightbulb size={14} />} onClick={() => setIdeaOpen(true)}>Post idea</Button>
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setProposeOpen(true)}>Propose event</Button>
          </div>
        }
      />

      {incoming.length > 0 && (
        <div className="p-4 rounded-xl bg-greek-50 border border-greek-200">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} className="text-greek-600" />
            <p className="font-semibold text-greek-700">{incoming.length} incoming proposal{incoming.length > 1 ? "s" : ""}</p>
          </div>
          <div className="space-y-2">
            {incoming.map((p) => (
              <button key={p.id} onClick={() => setSelectedProposal(p)} className="w-full flex items-center justify-between p-3 rounded-lg bg-card border border-border hover:border-greek-300 transition-colors text-left">
                <div>
                  <p className="text-sm font-medium">{p.event_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{p.event_type.replace("_", " ")}</p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      <InterchapterSummaryPanel orgId={orgId} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Incoming" value={incoming.length} icon={<MessageSquare size={18} />} />
        <StatCard title="Sent proposals" value={sent.length} icon={<Share2 size={18} />} />
        <StatCard title="Community ideas" value={ideas.length} icon={<Lightbulb size={18} />} />
        <StatCard title="Accepted" value={proposals.filter((p) => p.status === "accepted").length} deltaType="up" icon={<CheckCircle size={18} />} />
      </div>

      <Tabs
        tabs={[
          { id: "proposals", label: "Proposals", count: proposals.length },
          { id: "ideas", label: "Idea marketplace", count: ideas.length },
          { id: "availability", label: "Availability", count: availability.length },
          { id: "budget", label: "Budget split" },
          { id: "messages", label: "Messages", count: partnerOrgs.length || undefined },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "proposals" && (
        proposals.length === 0 ? (
          <EmptyState icon={<Calendar size={24} />} title="No proposals yet" description="Propose an event to another chapter to get started." action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setProposeOpen(true)}>Propose event</Button>} />
        ) : (
          <div className="space-y-3">
            {proposals.map((p) => {
              const isIncoming = p.target_org_id === orgId;
              const statusColor: Record<string, string> = { pending: "yellow", accepted: "green", declined: "red", counter_proposed: "blue", cancelled: "gray" };
              return (
                <Card key={p.id} onClick={() => setSelectedProposal(p)} className="cursor-pointer hover:border-greek-300 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isIncoming ? "bg-greek-50 dark:bg-greek-950/30" : "bg-blue-50 dark:bg-blue-950/30"}`}>
                      <Calendar size={16} className={isIncoming ? "text-greek-600" : "text-blue-600"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{p.event_name}</p>
                        <Badge label={p.status.replace("_", " ")} color={statusColor[p.status] as "green"} />
                        <Badge label={isIncoming ? "Incoming" : "Sent"} color={isIncoming ? "purple" : "blue"} />
                      </div>
                      <p className="text-xs text-muted-foreground capitalize">{p.event_type.replace("_", " ")}</p>
                      {p.budget_estimate && <p className="text-xs text-muted-foreground">Budget: {formatCurrency(p.budget_estimate)}</p>}
                    </div>
                    {p.alcohol && <Badge label="Alcohol" color="orange" className="flex-shrink-0" />}
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}

      {tab === "ideas" && (
        ideas.length === 0 ? (
          <EmptyState icon={<Lightbulb size={24} />} title="No ideas yet" description="Post mixer ideas, philanthropy concepts, or event proposals for other chapters to discover." action={<Button size="sm" icon={<Lightbulb size={14} />} onClick={() => setIdeaOpen(true)}>Post idea</Button>} />
        ) : (
          <div className="space-y-3">
            {ideas.map((idea) => (
              <Card key={idea.id} padding="sm">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => upvoteIdea(idea.id)}
                    className="flex flex-col items-center gap-0.5 p-2 rounded-lg hover:bg-surface-1 transition-colors flex-shrink-0"
                  >
                    <ThumbsUp size={14} className="text-greek-600" />
                    <span className="text-xs font-bold text-greek-600">{idea.upvotes}</span>
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{idea.title}</p>
                      <Badge label={idea.idea_type} color="blue" />
                      {idea.risk_level === "high" && <Badge label="High risk" color="red" />}
                    </div>
                    {idea.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{idea.description}</p>}
                    <div className="flex items-center gap-3 mt-1">
                      {idea.estimated_cost && <span className="text-xs text-muted-foreground">~{formatCurrency(idea.estimated_cost)}</span>}
                      {idea.poster_name && <span className="text-xs text-muted-foreground">by {idea.poster_name}</span>}
                    </div>
                  </div>
                  <Button size="sm" variant="secondary" icon={<ArrowRight size={12} />} onClick={() => { setProposalForm((f) => ({ ...f, eventName: idea.title, eventType: idea.idea_type })); setProposeOpen(true); }}>
                    Propose
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {tab === "availability" && userId && (
        <AvailabilityMatcher
          entries={availability}
          currentUserId={userId}
          memberName={userName}
          onSave={saveAvailability}
        />
      )}

      {tab === "budget" && (
        <JointBudgetSplitter orgAName="Your chapter" orgBName="Partner chapter" />
      )}

      {tab === "messages" && orgId && (
        <InterchapterMessagesPanel orgId={orgId} userName={userName} partners={partnerOrgs} />
      )}

      {/* Propose event modal */}
      <Modal open={proposeOpen} onClose={() => setProposeOpen(false)} title="Propose event to another chapter" size="lg"
        footer={<><Button variant="secondary" onClick={() => setProposeOpen(false)}>Cancel</Button><Button onClick={submitProposal} disabled={!proposalForm.eventName}>Send proposal</Button></>}
      >
        <div className="space-y-4">
          <Alert type="info" title="Your proposal will be sent to the target chapter's exec board for review." />
          <Input
            label="Search chapters"
            placeholder="Name or campus..."
            value={targetOrgSearch}
            onChange={(e) => setTargetOrgSearch(e.target.value)}
          />
          <Select
            label="Target chapter *"
            value={proposalForm.targetOrgId}
            onChange={(e) => setProposalForm({ ...proposalForm, targetOrgId: e.target.value })}
            options={[
              { value: "", label: greekOrgs.length ? "Select a chapter" : "Search to find chapters" },
              ...greekOrgs.map((o) => ({
                value: o.id,
                label: o.campus ? `${o.name} · ${o.campus}` : o.name,
              })),
            ]}
          />
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Event name *" placeholder="Spring Mixer 2025" value={proposalForm.eventName} onChange={(e) => setProposalForm({ ...proposalForm, eventName: e.target.value })} />
            <Select label="Event type" value={proposalForm.eventType} onChange={(e) => setProposalForm({ ...proposalForm, eventType: e.target.value })} options={[
              { value: "mixer", label: "Mixer" }, { value: "philanthropy", label: "Philanthropy" },
              { value: "formal", label: "Formal" }, { value: "tailgate", label: "Tailgate" },
              { value: "service", label: "Service" }, { value: "other", label: "Other" },
            ]} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Estimated attendance" type="number" placeholder="100" value={proposalForm.estimatedAttendance} onChange={(e) => setProposalForm({ ...proposalForm, estimatedAttendance: e.target.value })} />
            <Input label="Budget estimate ($)" type="number" placeholder="2500" value={proposalForm.budgetEstimate} onChange={(e) => setProposalForm({ ...proposalForm, budgetEstimate: e.target.value })} />
          </div>
          <Input label="Cost split proposal" placeholder="50/50, by headcount, 60/40..." value={proposalForm.costSplitProposal} onChange={(e) => setProposalForm({ ...proposalForm, costSplitProposal: e.target.value })} />
          <Input label="Theme ideas" placeholder="80s night, black and white..." value={proposalForm.themeIdeas} onChange={(e) => setProposalForm({ ...proposalForm, themeIdeas: e.target.value })} />
          <Input label="Venue ideas" placeholder="Local venue names..." value={proposalForm.venueIdeas} onChange={(e) => setProposalForm({ ...proposalForm, venueIdeas: e.target.value })} />
          <Input label="Philanthropy beneficiary (optional)" value={proposalForm.philanthropyBeneficiary} onChange={(e) => setProposalForm({ ...proposalForm, philanthropyBeneficiary: e.target.value })} />
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded" checked={proposalForm.alcohol} onChange={(e) => setProposalForm({ ...proposalForm, alcohol: e.target.checked })} />
              <span className="text-sm">Alcohol present</span>
            </label>
            <Select label="" value={proposalForm.riskLevel} onChange={(e) => setProposalForm({ ...proposalForm, riskLevel: e.target.value })} options={[{ value: "low", label: "Low risk" }, { value: "medium", label: "Medium risk" }, { value: "high", label: "High risk" }]} className="w-36" />
          </div>
        </div>
      </Modal>

      {/* Post idea modal */}
      <Modal open={ideaOpen} onClose={() => setIdeaOpen(false)} title="Post idea to marketplace"
        footer={<><Button variant="secondary" onClick={() => setIdeaOpen(false)}>Cancel</Button><Button onClick={postIdea} disabled={!ideaForm.title}>Post idea</Button></>}
      >
        <div className="space-y-4">
          <Input label="Idea title *" placeholder="Neon Carnival Mixer idea..." value={ideaForm.title} onChange={(e) => setIdeaForm({ ...ideaForm, title: e.target.value })} />
          <Textarea label="Description" placeholder="Describe the concept, vibe, and why it would be great..." value={ideaForm.description} onChange={(e) => setIdeaForm({ ...ideaForm, description: e.target.value })} />
          <div className="grid sm:grid-cols-2 gap-3">
            <Select label="Idea type" value={ideaForm.ideaType} onChange={(e) => setIdeaForm({ ...ideaForm, ideaType: e.target.value })} options={[
              { value: "mixer", label: "Mixer" }, { value: "philanthropy", label: "Philanthropy" },
              { value: "greek_week", label: "Greek Week" }, { value: "service", label: "Service" },
              { value: "tailgate", label: "Tailgate" }, { value: "wellness", label: "Wellness" },
              { value: "study_event", label: "Study event" }, { value: "other", label: "Other" },
            ]} />
            <Input label="Estimated cost ($)" type="number" placeholder="1500" value={ideaForm.estimatedCost} onChange={(e) => setIdeaForm({ ...ideaForm, estimatedCost: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* Proposal detail modal */}
      <Modal open={!!selectedProposal} onClose={() => setSelectedProposal(null)} title={selectedProposal?.event_name ?? ""} size="md"
        footer={
          <div className="flex gap-2 flex-wrap w-full">
            {selectedProposal?.status === "pending" && selectedProposal.target_org_id === orgId && (
              <>
                <Button onClick={() => respondToProposal(selectedProposal.id, "accepted")} className="flex-1">Accept</Button>
                <Button variant="secondary" onClick={() => respondToProposal(selectedProposal.id, "declined")} className="flex-1">Decline</Button>
              </>
            )}
            <Button variant="secondary" onClick={() => setSelectedProposal(null)} className="ml-auto">Close</Button>
          </div>
        }
      >
        {selectedProposal && (
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <Badge label={selectedProposal.status.replace("_", " ")} color={selectedProposal.status === "accepted" ? "green" : selectedProposal.status === "pending" ? "yellow" : "red"} />
              <Badge label={selectedProposal.event_type.replace("_", " ")} color="blue" />
              {selectedProposal.alcohol && <Badge label="Alcohol" color="orange" />}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {selectedProposal.estimated_attendance && <div className="p-2 bg-surface-1 rounded"><p className="text-xs text-muted-foreground">Attendance</p><p className="font-semibold">{selectedProposal.estimated_attendance}</p></div>}
              {selectedProposal.budget_estimate && <div className="p-2 bg-surface-1 rounded"><p className="text-xs text-muted-foreground">Budget</p><p className="font-semibold">{formatCurrency(selectedProposal.budget_estimate)}</p></div>}
              {selectedProposal.cost_split_proposal && <div className="p-2 bg-surface-1 rounded"><p className="text-xs text-muted-foreground">Cost split</p><p className="font-semibold">{selectedProposal.cost_split_proposal}</p></div>}
              {selectedProposal.risk_level && <div className="p-2 bg-surface-1 rounded"><p className="text-xs text-muted-foreground">Risk level</p><p className="font-semibold capitalize">{selectedProposal.risk_level}</p></div>}
            </div>
            {selectedProposal.theme_ideas && <div><p className="text-xs text-muted-foreground mb-1">Theme ideas</p><p className="text-sm">{selectedProposal.theme_ideas}</p></div>}
            {selectedProposal.venue_ideas && <div><p className="text-xs text-muted-foreground mb-1">Venue ideas</p><p className="text-sm">{selectedProposal.venue_ideas}</p></div>}
            {selectedProposal.philanthropy_beneficiary && <div><p className="text-xs text-muted-foreground mb-1">Philanthropy beneficiary</p><p className="text-sm">{selectedProposal.philanthropy_beneficiary}</p></div>}
            {selectedProposal.status === "accepted" && (
              <a href={`/interchapter/workspace?proposal=${selectedProposal.id}`} className="text-sm text-greek-600 hover:underline block mt-2">Open shared workspace →</a>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
