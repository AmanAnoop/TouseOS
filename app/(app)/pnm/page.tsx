"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Plus, User } from "lucide-react";
import toast from "react-hot-toast";
import { useOrg } from "@/hooks/use-org";
import {
  Avatar, Badge, Button, Card, EmptyState, Modal,
  CardHeader, Input, PageHeader, SearchInput, Tabs,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { PnmLead, PnmStatus } from "@/types";
import { PnmVotingPanel } from "@/components/pnm/voting-panel";
import { ProfileEnrichmentPanel } from "@/components/pnm/profile-enrichment-panel";
import { RushMatchPanel } from "@/components/pnm/rush-match-panel";
import { RelationshipGraphPanel } from "@/components/pnm/relationship-graph-panel";
import { RecruitmentLinksPanel } from "@/components/pnm/recruitment-links-panel";
import { RecruitmentAnalyticsPanel } from "@/components/pnm/recruitment-analytics-panel";
import { PnmLeadAutofillFields } from "@/components/pnm/pnm-lead-autofill-fields";
import { PnmEventsTab } from "@/components/pnm/pnm-events-tab";

const PIPELINE_STAGES: PnmStatus[] = [
  "lead","contacted","invited","attended","interested",
  "high_priority","bid_discussion","bid_extended","accepted","declined",
];

const STATUS_COLOR: Record<PnmStatus, string> = {
  lead: "gray", contacted: "blue", invited: "blue", attended: "green",
  interested: "green", high_priority: "purple", bid_discussion: "purple",
  bid_extended: "orange", accepted: "green", declined: "red", removed: "red",
};

export default function PnmPage() {
  const { orgId, orgName } = useOrg();
  const [leads, setLeads] = useState<PnmLead[]>([]);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [tab, setTab] = useState("pipeline");
  const [addOpen, setAddOpen] = useState(false);
  const [textOpen, setTextOpen] = useState(false);
  const [textBody, setTextBody] = useState("");
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [matcherPnmId, setMatcherPnmId] = useState<string | null>(null);
  const [enrichKey, setEnrichKey] = useState(0);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [chapterMembers, setChapterMembers] = useState<Array<{ id: string; full_name: string; profile_photo_url?: string | null }>>([]);
  const [universityId, setUniversityId] = useState<string | null>(null);

  const [newLead, setNewLead] = useState({
    fullName: "", email: "", phone: "", instagramHandle: "",
    classYear: "", major: "", hometown: "", referralSource: "",
    activeMemberConnections: [] as string[],
    communicationConsent: false,
  });

  const loadLeads = useCallback(async (oid: string) => {
    const res = await fetch(`/api/pnm?org_id=${encodeURIComponent(oid)}`);
    if (res.ok) setLeads((await res.json()) as PnmLead[]);
  }, []);

  useEffect(() => {
    if (!orgId) return;
    loadLeads(orgId);
    (async () => {
      const orgRes = await fetch(`/api/org/settings?org_id=${encodeURIComponent(orgId)}`);
      if (orgRes.ok) {
        const { org } = await orgRes.json();
        setInviteCode(org?.invite_code ? String(org.invite_code) : null);
        const settings = (org?.settings ?? {}) as Record<string, unknown>;
        setUniversityId(typeof settings.university_id === "string" ? settings.university_id : null);
      }
      const memRes = await fetch(`/api/members?org_id=${encodeURIComponent(orgId)}`);
      if (memRes.ok) {
        const mems = (await memRes.json()) as Array<{ id: string; full_name: string; membership_status: string }>;
        setChapterMembers(
          mems.filter((m) => m.membership_status === "active").map((m) => ({
            id: m.id,
            full_name: m.full_name,
            profile_photo_url: (m as { profile_photo_url?: string }).profile_photo_url ?? null,
          })),
        );
      }
    })();
  }, [orgId, loadLeads]);

  const filtered = leads.filter((l) => {
    const q = query.toLowerCase();
    const matchesQuery = !q || l.full_name.toLowerCase().includes(q) || (l.email ?? "").toLowerCase().includes(q) || (l.major ?? "").toLowerCase().includes(q);
    const matchesStage = stageFilter === "all" || l.status === stageFilter;
    return matchesQuery && matchesStage;
  });

  const byStage = PIPELINE_STAGES.map((stage) => ({
    stage,
    leads: filtered.filter((l) => l.status === stage),
  }));

  async function addLead() {
    if (!orgId || !newLead.fullName) return;
    const res = await fetch("/api/pnm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        fullName: newLead.fullName,
        email: newLead.email,
        phone: newLead.phone,
        instagramHandle: newLead.instagramHandle,
        classYear: newLead.classYear,
        major: newLead.major,
        hometown: newLead.hometown,
        referralSource: newLead.referralSource,
        activeMemberConnection: newLead.activeMemberConnections.join(", "),
        communicationConsent: newLead.communicationConsent,
        consentSource: newLead.communicationConsent ? "manual_entry" : null,
      }),
    });
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Failed to add PNM");
      return;
    }
    toast.success("PNM added");
    setAddOpen(false);
    setNewLead({ fullName: "", email: "", phone: "", instagramHandle: "", classYear: "", major: "", hometown: "", referralSource: "", activeMemberConnections: [], communicationConsent: false });
    loadLeads(orgId);
  }

  async function updateStatus(id: string, status: PnmStatus) {
    const res = await fetch("/api/pnm", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status } : l));
    } else {
      toast.error((await res.json()).error ?? "Update failed");
    }
  }

  async function sendMassText() {
    const opted = leads.filter(
      (l) => selectedLeads.includes(l.id) && l.communication_consent && !l.opted_out && l.phone,
    );
    if (opted.length === 0) {
      toast.error("No opted-in leads selected with valid phone numbers");
      return;
    }
    const res = await fetch("/api/twilio/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, recipients: opted.map((l) => ({ phone: l.phone!, name: l.full_name })), body: textBody }),
    });
    if (res.ok) {
      toast.success(`Texts queued for ${opted.length} leads`);
      setTextOpen(false);
      setTextBody("");
      setSelectedLeads([]);
    } else toast.error("Failed to send texts");
  }

  return (
    <div className="ds-page-stack">
      <PageHeader
        title="PNM Recruitment CRM"
        description={`${leads.length} potential new members · ${leads.filter((l) => l.communication_consent).length} opted in to SMS`}
        action={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<MessageSquare size={14} />}
              onClick={() => setTextOpen(true)}
              disabled={leads.filter((l) => l.communication_consent && !l.opted_out).length === 0}
            >
              Mass text
            </Button>
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setAddOpen(true)}>
              Add PNM
            </Button>
          </div>
        }
      />

      <Tabs
        tabs={[
          { id: "pipeline", label: "Pipeline", count: leads.length },
          { id: "list", label: "List view" },
          { id: "analytics", label: "Analytics" },
          { id: "matcher", label: "Rush matcher" },
          { id: "recruitment", label: "Recruitment links" },
          { id: "voting", label: "Voting" },
          { id: "events", label: "Events" },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="flex gap-3 flex-wrap">
        <SearchInput value={query} onChange={setQuery} placeholder="Search PNMs..." className="flex-1 min-w-[200px]" />
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All stages</option>
          {PIPELINE_STAGES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      {tab === "pipeline" && (
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
          {byStage.filter((s) => ["lead","contacted","invited","attended","interested","high_priority","bid_discussion"].includes(s.stage)).map(({ stage, leads: stageLeads }) => (
            <div key={stage} className="flex-shrink-0 w-56">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {stage.replace(/_/g, " ")}
                </span>
                <Badge label={String(stageLeads.length)} color={STATUS_COLOR[stage] as "green"} />
              </div>
              <div className="space-y-2">
                {stageLeads.map((lead) => (
                  <Card key={lead.id} padding="sm" className="cursor-pointer hover:border-greek-300 transition-colors">
                    <div className="flex items-center gap-2">
                      <Avatar name={lead.full_name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{lead.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{lead.major ?? lead.class_year ?? "—"}</p>
                      </div>
                    </div>
                    {lead.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {lead.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[10px] bg-surface-2 rounded px-1.5 py-0.5 text-muted-foreground">{tag}</span>
                        ))}
                      </div>
                    )}
                    {lead.communication_consent && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-green-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        SMS opt-in
                      </div>
                    )}
                    <select
                      className="mt-2 w-full text-xs border border-border rounded px-1.5 py-1 bg-background focus:outline-none"
                      value={lead.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateStatus(lead.id, e.target.value as PnmStatus)}
                    >
                      {PIPELINE_STAGES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                    </select>
                  </Card>
                ))}
                {stageLeads.length === 0 && (
                  <div className="border-2 border-dashed border-border rounded-lg p-3 text-center text-xs text-muted-foreground">
                    Empty
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "list" && (
        <Card padding="none">
          <div className="divide-y divide-border">
            {filtered.length === 0 ? (
              <EmptyState
                className="py-8"
                icon={<User size={20} />}
                title="No PNMs found"
                action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setAddOpen(true)}>Add PNM</Button>}
              />
            ) : filtered.map((lead) => (
              <div key={lead.id} className="flex items-center gap-3 p-4 hover:bg-surface-1 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedLeads.includes(lead.id)}
                  onChange={(e) => setSelectedLeads((prev) => e.target.checked ? [...prev, lead.id] : prev.filter((id) => id !== lead.id))}
                  className="rounded"
                />
                <Avatar name={lead.full_name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">{lead.full_name}</p>
                    <Badge label={lead.status.replace(/_/g, " ")} color={STATUS_COLOR[lead.status] as "green"} />
                    {lead.communication_consent && !lead.opted_out && (
                      <Badge label="SMS opt-in" color="green" dot />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {[lead.major, lead.class_year, lead.hometown].filter(Boolean).join(" · ")}
                  </p>
                  {lead.referral_source && (
                    <p className="text-xs text-muted-foreground">
                      Referred by: {lead.referral_source}
                    </p>
                  )}
                </div>
                <div className="text-right text-xs text-muted-foreground flex-shrink-0">
                  {formatDate(lead.created_at)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "analytics" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PIPELINE_STAGES.map((stage) => {
            const count = leads.filter((l) => l.status === stage).length;
            const pct = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
            return (
              <Card key={stage} padding="sm">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-medium capitalize">{stage.replace(/_/g, " ")}</p>
                  <Badge label={String(count)} color={STATUS_COLOR[stage] as "green"} />
                </div>
                <div className="mt-2 h-2 rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-greek-500" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{pct}% of pipeline</p>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add PNM modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add PNM"
        description="All contact info is voluntary. SMS requires explicit opt-in."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addLead} disabled={!newLead.fullName}>Add PNM</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Full name" required value={newLead.fullName} onChange={(e) => setNewLead({ ...newLead, fullName: e.target.value })} placeholder="Jane Smith" />
            <Input label="Email" type="email" value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} placeholder="jane@college.edu" />
            <Input label="Phone (optional)" type="tel" value={newLead.phone} onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })} placeholder="+1 (555) 000-0000" />
            <Input label="Instagram handle (optional)" value={newLead.instagramHandle} onChange={(e) => setNewLead({ ...newLead, instagramHandle: e.target.value })} placeholder="@janesmithh" />
          </div>
          <PnmLeadAutofillFields
            values={{
              classYear: newLead.classYear,
              major: newLead.major,
              hometown: newLead.hometown,
              referralSource: newLead.referralSource,
              activeMemberConnections: newLead.activeMemberConnections,
            }}
            onChange={(patch) => setNewLead({ ...newLead, ...patch })}
            members={chapterMembers}
            universityId={universityId}
          />

          {/* Consent checkbox – mandatory for SMS */}
          <div className="border border-border rounded-lg p-4 bg-surface-1">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 rounded"
                checked={newLead.communicationConsent}
                onChange={(e) => setNewLead({ ...newLead, communicationConsent: e.target.checked })}
              />
              <div>
                <p className="text-sm font-medium">SMS communication consent</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Check only if this person has explicitly agreed to receive text messages from your chapter.
                  They can opt out at any time by replying STOP. Do not check this without their explicit consent.
                </p>
              </div>
            </label>
          </div>
        </div>
      </Modal>

      
      
      {tab === "analytics" && orgId && (
        <RecruitmentAnalyticsPanel orgId={orgId} />
      )}

      {tab === "recruitment" && (
        <RecruitmentLinksPanel orgName={orgName} inviteCode={inviteCode} />
      )}

      {tab === "matcher" && orgId && (
        <div className="grid lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-1 max-h-[70vh] overflow-y-auto">
            <CardHeader title="PNMs" />
            <div className="space-y-1">
              {filtered.filter((l) => !["declined", "removed"].includes(l.status)).map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setMatcherPnmId(l.id)}
                  className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${matcherPnmId === l.id ? "bg-greek-100 dark:bg-greek-950/40 font-medium" : "hover:bg-surface-1"}`}
                >
                  {l.full_name}
                  {l.interests?.length > 0 && (
                    <span className="text-xs text-muted-foreground block">{l.interests.length} interests</span>
                  )}
                </button>
              ))}
            </div>
          </Card>
          <div className="lg:col-span-2 space-y-5">
            <ProfileEnrichmentPanel
              orgId={orgId}
              pnm={leads.find((l) => l.id === matcherPnmId) ?? null}
              onEnriched={() => { loadLeads(orgId); setEnrichKey((k) => k + 1); }}
            />
            <RushMatchPanel
              orgId={orgId}
              pnm={leads.find((l) => l.id === matcherPnmId) ?? null}
              refreshKey={enrichKey}
            />
            <RelationshipGraphPanel
              orgId={orgId}
              pnm={leads.find((l) => l.id === matcherPnmId) ?? null}
              members={chapterMembers}
            />
          </div>
        </div>
      )}

      {tab === "voting" && orgId && (
        <PnmVotingPanel orgId={orgId} leads={leads} />
      )}

      {tab === "events" && orgId && (
        <PnmEventsTab orgId={orgId} pnms={leads} />
      )}

      {/* Mass text modal */}
      <Modal
        open={textOpen}
        onClose={() => setTextOpen(false)}
        title="Send mass text"
        description={`Only sends to PNMs who have opted in. ${leads.filter((l) => l.communication_consent && !l.opted_out && l.phone).length} eligible.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setTextOpen(false)}>Cancel</Button>
            <Button onClick={sendMassText} disabled={!textBody || selectedLeads.length === 0}>
              Send texts
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm text-yellow-800 dark:text-yellow-300">
            <strong>Consent required.</strong> Only opted-in PNMs will receive messages. STOP/HELP handling is automatic. Quiet hours apply (9pm–9am).
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Message</label>
            <textarea
              className="min-h-[100px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Hi {{name}}, ..."
              value={textBody}
              onChange={(e) => setTextBody(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Use {"{{name}}"} for personalization. {textBody.length}/160 chars.</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {selectedLeads.length === 0 ? "Select PNMs in the list view to send to specific leads." : `${selectedLeads.length} leads selected.`}
          </p>
        </div>
      </Modal>
    </div>
  );
}
