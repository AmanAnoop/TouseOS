"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Award,
  Download,
  Minus,
  Plus,
  Settings2,
  Trophy,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  ProgressBar,
  StatCard,
  Tabs,
} from "@/components/ui";
import { MemberPointsBreakdown } from "@/components/points/member-points-breakdown";
import { PointOpportunitiesPanel, type PointOpportunity } from "@/components/points/point-opportunities-panel";
import { PointRequestsPanel } from "@/components/points/point-requests-panel";
import { PointsRulesEditor } from "@/components/points/points-rules-editor";
import { PointsSystemOverview } from "@/components/points/points-system-overview";
import { DEFAULT_ELIGIBILITY_MIN, mergeRulesWithCatalog, type PointRule } from "@/lib/attendance-points";
import { eventTypesForOrgType } from "@/lib/org-product";
import { can, type RoleName } from "@/lib/permissions";
import { filterRosterMembers } from "@/lib/member-filters";
import { useOrg } from "@/hooks/use-org";
import { formatDate } from "@/lib/utils";
import type { MemberProfile } from "@/types";

interface PointEntry {
  id: string;
  member_id: string;
  points: number;
  reason: string | null;
  category: string | null;
  entry_type: string;
  created_at: string;
}

export default function AttendancePointsPage() {
  const { orgId, orgType, role, userId } = useOrg();
  const [tab, setTab] = useState("overview");
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [entries, setEntries] = useState<PointEntry[]>([]);
  const [opportunities, setOpportunities] = useState<PointOpportunity[]>([]);
  const [requests, setRequests] = useState<Array<Record<string, unknown>>>([]);
  const [isOfficerView, setIsOfficerView] = useState(false);
  const [rules, setRules] = useState<PointRule[]>([]);
  const [rulesPersisted, setRulesPersisted] = useState(false);
  const [eligibilityMin, setEligibilityMin] = useState(DEFAULT_ELIGIBILITY_MIN);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);

  const [awardOpen, setAwardOpen] = useState(false);
  const [deductOpen, setDeductOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [awardForm, setAwardForm] = useState({ memberId: "", points: "2", reason: "" });
  const [deductForm, setDeductForm] = useState({ memberId: "", points: "1", reason: "" });
  const [thresholdDraft, setThresholdDraft] = useState(String(DEFAULT_ELIGIBILITY_MIN));
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [leaderboardSearch, setLeaderboardSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [breakdownMember, setBreakdownMember] = useState<(MemberProfile & { pts: number }) | null>(null);

  const catalog = useMemo(() => eventTypesForOrgType(orgType || "fraternity"), [orgType]);

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const [mRes, pRes, rRes, oRes, reqRes] = await Promise.all([
      fetch(`/api/members?org_id=${encodeURIComponent(oid)}&scope=roster`),
      fetch(`/api/member-points?org_id=${encodeURIComponent(oid)}`),
      fetch(`/api/attendance-point-rules?org_id=${encodeURIComponent(oid)}`),
      fetch(`/api/point-opportunities?org_id=${encodeURIComponent(oid)}&active=false`),
      fetch(`/api/point-requests?org_id=${encodeURIComponent(oid)}`),
    ]);
    if (mRes.ok) setMembers((await mRes.json()) as MemberProfile[]);
    if (pRes.ok) {
      const payload = await pRes.json();
      setEntries((payload.entries ?? []) as PointEntry[]);
      setIsOfficerView(Boolean(payload.isOfficer));
      if (payload.eligibilityMin != null) {
        setEligibilityMin(payload.eligibilityMin);
        setThresholdDraft(String(payload.eligibilityMin));
      }
    }
    if (oRes.ok) setOpportunities((await oRes.json()) as PointOpportunity[]);
    if (reqRes.ok) setRequests(await reqRes.json());
    if (rRes.ok) {
      const payload = await rRes.json();
      const saved = (payload.rules ?? []) as PointRule[];
      setRules(saved.length ? saved : mergeRulesWithCatalog([], catalog));
      setRulesPersisted(Boolean(payload.persisted));
      setCanManage(Boolean(payload.canManage));
      if (payload.eligibilityMin != null) {
        setEligibilityMin(payload.eligibilityMin);
        setThresholdDraft(String(payload.eligibilityMin));
      }
    }
    setLoading(false);
  }, [catalog]);

  useEffect(() => {
    if (orgId) load(orgId);
  }, [orgId, load]);

  const canManageLocal =
    isOfficerView ||
    canManage ||
    can(role as RoleName, "manage_events") ||
    can(role as RoleName, "edit_roster");

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      if (e.category?.trim()) set.add(e.category.trim());
    }
    for (const o of opportunities) {
      if (o.category?.trim()) set.add(o.category.trim());
    }
    return Array.from(set).sort();
  }, [entries, opportunities]);

  const pointsInCategory = useCallback((memberId: string, cat: string | null) => {
    return entries
      .filter((e) => e.member_id === memberId)
      .filter((e) => !cat || (e.category ?? "General") === cat)
      .reduce((s, e) => s + (e.entry_type === "deduction" ? -e.points : e.points), 0);
  }, [entries]);

  const memberNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const mem of members) m.set(mem.id, mem.full_name);
    return m;
  }, [members]);

  const fullLeaderboard = useMemo(() => {
    return filterRosterMembers(members)
      .map((mem) => {
        const pts = categoryFilter
          ? pointsInCategory(mem.id, categoryFilter)
          : entries
              .filter((e) => e.member_id === mem.id)
              .reduce((s, e) => s + (e.entry_type === "deduction" ? -e.points : e.points), 0);
        return { ...mem, pts };
      })
      .sort((a, b) => b.pts - a.pts);
  }, [members, entries, categoryFilter, pointsInCategory]);

  const leaderboard = useMemo(() => {
    const q = leaderboardSearch.trim().toLowerCase();
    return fullLeaderboard.filter((mem) => !q || mem.full_name.toLowerCase().includes(q));
  }, [fullLeaderboard, leaderboardSearch]);

  const rankByMemberId = useMemo(() => {
    const m = new Map<string, number>();
    fullLeaderboard.forEach((mem, i) => m.set(mem.id, i + 1));
    return m;
  }, [fullLeaderboard]);

  const eligibleCount = leaderboard.filter((m) => m.pts >= eligibilityMin).length;
  const activeRules = rules.filter((r) => r.points > 0).length;

  async function postEntry(
    memberId: string,
    points: number,
    reason: string,
    entryType: "earned" | "deduction",
  ) {
    if (!orgId) return;
    const res = await fetch("/api/member-points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, memberId, points, reason, entryType }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Failed");
      return false;
    }
    toast.success(entryType === "deduction" ? "Points deducted" : "Points awarded");
    load(orgId);
    return true;
  }

  async function awardPoints() {
    if (!awardForm.memberId || !awardForm.points) return;
    const ok = await postEntry(
      awardForm.memberId,
      parseInt(awardForm.points, 10),
      awardForm.reason || "Manual award",
      "earned",
    );
    if (ok) {
      setAwardOpen(false);
      setAwardForm({ memberId: "", points: "2", reason: "" });
    }
  }

  async function deductPoints() {
    if (!deductForm.memberId || !deductForm.points) return;
    const ok = await postEntry(
      deductForm.memberId,
      parseInt(deductForm.points, 10),
      deductForm.reason || "Manual deduction",
      "deduction",
    );
    if (ok) {
      setDeductOpen(false);
      setDeductForm({ memberId: "", points: "1", reason: "" });
    }
  }

  async function saveThreshold() {
    if (!orgId || !canManageLocal) return;
    setSavingThreshold(true);
    const res = await fetch("/api/attendance-point-rules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        eligibilityMin: parseInt(thresholdDraft, 10) || DEFAULT_ELIGIBILITY_MIN,
      }),
    });
    setSavingThreshold(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error((data as { error?: string }).error ?? "Failed to save");
      return;
    }
    setEligibilityMin(data.eligibilityMin ?? eligibilityMin);
    setSettingsOpen(false);
    toast.success("Eligibility threshold updated");
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-surface-2" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-20 animate-pulse bg-surface-2 border-0">&nbsp;</Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="ds-page-stack">
      <PageHeader
        title="Points System"
        description="Configure event-type awards, track member standings, and manage eligibility"
        action={
          canManageLocal ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" icon={<Minus size={14} />} onClick={() => setDeductOpen(true)}>
                Deduct
              </Button>
              <Button size="sm" icon={<Plus size={14} />} onClick={() => setAwardOpen(true)}>
                Award
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Members" value={members.length} icon={<Trophy size={18} />} />
        <StatCard title="Eligible" value={`${eligibleCount}/${members.length || 0}`} icon={<Award size={18} />} />
        <StatCard title="Active event types" value={activeRules} icon={<Zap size={18} />} />
        <StatCard title="Eligibility min" value={`${eligibilityMin} pts`} icon={<Settings2 size={18} />} />
      </div>

      {canManageLocal && (
        <div className="flex justify-end -mt-2">
          <button
            type="button"
            className="text-xs text-greek-600 hover:underline inline-flex items-center gap-1"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 size={12} /> Edit eligibility threshold
          </button>
        </div>
      )}

      <Tabs
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "requests", label: canManageLocal ? "Requests" : "My requests", count: requests.filter((r) => r.status === "pending").length || undefined },
          { id: "opportunities", label: "Opportunities", count: opportunities.filter((o) => o.active).length },
          ...(canManageLocal ? [
            { id: "rules", label: "Event types", count: rules.length },
            { id: "leaderboard", label: "Leaderboard", count: members.length },
            { id: "activity", label: "Activity", count: entries.length },
          ] : []),
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "overview" && (
        <PointsSystemOverview
          rules={rules.filter((r) => r.points > 0).map((r) => ({ label: r.label ?? "Points", points: r.points }))}
          leaderboard={canManageLocal ? leaderboard : []}
          rankByMemberId={rankByMemberId}
          entries={entries}
          eligibilityMin={eligibilityMin}
          currentMemberId={members.find((m) => m.user_id === userId)?.id ?? null}
          isOfficer={canManageLocal}
        />
      )}

      {tab === "requests" && orgId && (
        <PointRequestsPanel
          orgId={orgId}
          requests={requests as never}
          opportunities={opportunities.filter((o) => o.active)}
          canManage={canManageLocal}
          onChanged={() => load(orgId)}
        />
      )}

      {tab === "opportunities" && orgId && (
        <PointOpportunitiesPanel
          orgId={orgId}
          opportunities={opportunities}
          canManage={canManageLocal}
          onChanged={() => load(orgId)}
        />
      )}

      {tab === "rules" && orgId && (
        <PointsRulesEditor
          orgId={orgId}
          orgType={orgType}
          initialRules={rules}
          persisted={rulesPersisted}
          canManage={canManageLocal}
          onSaved={() => load(orgId)}
        />
      )}

      {tab === "leaderboard" && canManageLocal && (
        <Card>
          <CardHeader
            title="Member standings"
            action={
              <a href={`/api/member-points/export?org_id=${encodeURIComponent(orgId!)}${categoryFilter ? `&category=${encodeURIComponent(categoryFilter)}` : ""}`}>
                <Button variant="secondary" size="sm" icon={<Download size={14} />}>Export</Button>
              </a>
            }
          />
          <div className="flex flex-wrap gap-3 mb-4">
            <Input
              placeholder="Search members..."
              value={leaderboardSearch}
              onChange={(e) => setLeaderboardSearch(e.target.value)}
              className="max-w-sm flex-1"
            />
            <select
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          {leaderboard.length === 0 ? (
            <EmptyState icon={<Trophy size={20} />} title="No members" description="Add members to your roster first." />
          ) : (
            <div className="space-y-2">
              {leaderboard.map((m, i) => {
                const eligible = m.pts >= eligibilityMin;
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => setBreakdownMember(m)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-greek-200 transition-colors text-left"
                  >
                    <span className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center font-bold text-sm text-muted-foreground">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{m.full_name}</p>
                      <ProgressBar
                        value={Math.min(100, Math.round((m.pts / eligibilityMin) * 100))}
                        label={`${m.pts} / ${eligibilityMin} points`}
                        color={eligible ? "green" : "yellow"}
                        size="sm"
                      />
                    </div>
                    <Badge label={eligible ? "Eligible" : `${eligibilityMin - m.pts} to go`} color={eligible ? "green" : "gray"} />
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {tab === "activity" && canManageLocal && (
        <Card>
          <CardHeader title="Point history" description="Last 100 entries for your organization" />
          {entries.length === 0 ? (
            <EmptyState icon={<Award size={20} />} title="No activity" description="Check-ins and manual awards appear here." />
          ) : (
            <div className="divide-y divide-border">
              {entries.map((e) => (
                <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div>
                    <p className="font-medium">{memberNameById.get(e.member_id) ?? "Member"}</p>
                    <p className="text-muted-foreground text-xs">{e.reason ?? "—"}{e.category ? ` · ${e.category}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      label={`${e.entry_type === "deduction" ? "−" : "+"}${e.points} pts`}
                      color={e.entry_type === "deduction" ? "red" : "green"}
                    />
                    <span className="text-xs text-muted-foreground">{formatDate(e.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {breakdownMember && (
        <MemberPointsBreakdown
          open={!!breakdownMember}
          onClose={() => setBreakdownMember(null)}
          memberName={breakdownMember.full_name}
          totalPoints={breakdownMember.pts}
          entries={entries.filter((e) => e.member_id === breakdownMember.id)}
          categoryFilter={categoryFilter || null}
        />
      )}

      <Modal
        open={awardOpen}
        onClose={() => setAwardOpen(false)}
        title="Award points"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAwardOpen(false)}>Cancel</Button>
            <Button onClick={awardPoints}>Award</Button>
          </>
        }
      >
        <div className="space-y-3">
          <select
            className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
            value={awardForm.memberId}
            onChange={(e) => setAwardForm({ ...awardForm, memberId: e.target.value })}
          >
            <option value="">Select member</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
          <Input
            label="Points"
            type="number"
            min={1}
            value={awardForm.points}
            onChange={(e) => setAwardForm({ ...awardForm, points: e.target.value })}
          />
          <Input
            label="Reason"
            value={awardForm.reason}
            onChange={(e) => setAwardForm({ ...awardForm, reason: e.target.value })}
            placeholder="Philanthropy event attendance"
          />
        </div>
      </Modal>

      <Modal
        open={deductOpen}
        onClose={() => setDeductOpen(false)}
        title="Deduct points"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeductOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={deductPoints}>Deduct</Button>
          </>
        }
      >
        <div className="space-y-3">
          <select
            className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
            value={deductForm.memberId}
            onChange={(e) => setDeductForm({ ...deductForm, memberId: e.target.value })}
          >
            <option value="">Select member</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
          <Input label="Points to deduct" type="number" min={1} value={deductForm.points} onChange={(e) => setDeductForm({ ...deductForm, points: e.target.value })} />
          <Input label="Reason" value={deductForm.reason} onChange={(e) => setDeductForm({ ...deductForm, reason: e.target.value })} placeholder="Missed required event" />
        </div>
      </Modal>

      <Modal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Eligibility threshold"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSettingsOpen(false)}>Cancel</Button>
            <Button loading={savingThreshold} onClick={saveThreshold}>Save</Button>
          </>
        }
      >
        <Input
          label="Minimum points to be eligible"
          type="number"
          min={1}
          max={500}
          value={thresholdDraft}
          onChange={(e) => setThresholdDraft(e.target.value)}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Members at or above this total show as eligible on the leaderboard.
        </p>
      </Modal>
    </div>
  );
}
