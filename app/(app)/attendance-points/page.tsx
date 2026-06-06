"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Award,
  ChevronRight,
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
import { PointsRulesEditor } from "@/components/points/points-rules-editor";
import { DEFAULT_ELIGIBILITY_MIN, mergeRulesWithCatalog, type PointRule } from "@/lib/attendance-points";
import { eventTypesForOrgType } from "@/lib/org-product";
import { can, type RoleName } from "@/lib/permissions";
import { useOrg } from "@/hooks/use-org";
import { formatDate } from "@/lib/utils";
import type { MemberProfile } from "@/types";

interface PointEntry {
  id: string;
  member_id: string;
  points: number;
  reason: string | null;
  entry_type: string;
  created_at: string;
}

export default function AttendancePointsPage() {
  const { orgId, orgType, role } = useOrg();
  const [tab, setTab] = useState("overview");
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [entries, setEntries] = useState<PointEntry[]>([]);
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

  const catalog = useMemo(() => eventTypesForOrgType(orgType || "fraternity"), [orgType]);

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const [mRes, pRes, rRes] = await Promise.all([
      fetch(`/api/members?org_id=${encodeURIComponent(oid)}`),
      fetch(`/api/member-points?org_id=${encodeURIComponent(oid)}`),
      fetch(`/api/attendance-point-rules?org_id=${encodeURIComponent(oid)}`),
    ]);
    if (mRes.ok) setMembers((await mRes.json()) as MemberProfile[]);
    if (pRes.ok) {
      const payload = await pRes.json();
      setEntries((payload.entries ?? []) as PointEntry[]);
      if (payload.eligibilityMin != null) {
        setEligibilityMin(payload.eligibilityMin);
        setThresholdDraft(String(payload.eligibilityMin));
      }
    }
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
    canManage ||
    can(role as RoleName, "manage_events") ||
    can(role as RoleName, "edit_roster");

  const memberNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const mem of members) m.set(mem.id, mem.full_name);
    return m;
  }, [members]);

  const leaderboard = useMemo(() => {
    const q = leaderboardSearch.trim().toLowerCase();
    return [...members]
      .map((mem) => {
        const pts = entries
          .filter((e) => e.member_id === mem.id)
          .reduce((s, e) => s + (e.entry_type === "deduction" ? -e.points : e.points), 0);
        return { ...mem, pts };
      })
      .filter((mem) => !q || mem.full_name.toLowerCase().includes(q))
      .sort((a, b) => b.pts - a.pts);
  }, [members, entries, leaderboardSearch]);

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
          { id: "rules", label: "Event types", count: rules.length },
          { id: "leaderboard", label: "Leaderboard", count: members.length },
          { id: "activity", label: "Activity", count: entries.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "overview" && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader
              title="How it works"
              description="Points flow from your rules into member totals"
            />
            <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
              <li>Officers set points per <strong className="text-foreground">event type</strong> on the Rules tab.</li>
              <li>When members <strong className="text-foreground">QR check in</strong>, matching types auto-award points once per event.</li>
              <li>Officers can <strong className="text-foreground">manually award or deduct</strong> points anytime.</li>
              <li>Members at or above <strong className="text-foreground">{eligibilityMin} points</strong> show as eligible.</li>
            </ol>
            <Button
              size="sm"
              variant="secondary"
              className="mt-4"
              icon={<ChevronRight size={14} />}
              onClick={() => setTab("rules")}
            >
              Configure event types
            </Button>
          </Card>

          <Card>
            <CardHeader title="Top members" />
            {leaderboard.length === 0 ? (
              <EmptyState icon={<Trophy size={20} />} title="No standings yet" description="Award points or run a check-in event." />
            ) : (
              <div className="space-y-2">
                {leaderboard.slice(0, 5).map((m, i) => {
                  const eligible = m.pts >= eligibilityMin;
                  return (
                    <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-1">
                      <span className="w-6 text-center font-bold text-muted-foreground">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{m.full_name}</p>
                        <ProgressBar
                          value={Math.min(100, Math.round((m.pts / eligibilityMin) * 100))}
                          label={`${m.pts} pts`}
                          color={eligible ? "green" : "yellow"}
                          size="sm"
                        />
                      </div>
                      <Badge label={eligible ? "Eligible" : "Below min"} color={eligible ? "green" : "red"} />
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader title="Recent activity" />
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No point entries yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {entries.slice(0, 8).map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-2 text-sm py-1.5 border-b border-border last:border-0">
                    <span className="truncate">
                      {memberNameById.get(e.member_id) ?? "Member"} · {e.reason ?? "Points"}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        label={`${e.entry_type === "deduction" ? "−" : "+"}${e.points}`}
                        color={e.entry_type === "deduction" ? "red" : "green"}
                      />
                      <span className="text-xs text-muted-foreground">{formatDate(e.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {entries.length > 0 && (
              <Button size="sm" variant="secondary" className="mt-3" onClick={() => setTab("activity")}>
                View all activity
              </Button>
            )}
          </Card>
        </div>
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

      {tab === "leaderboard" && (
        <Card>
          <CardHeader title="Member standings" />
          <Input
            placeholder="Search members..."
            value={leaderboardSearch}
            onChange={(e) => setLeaderboardSearch(e.target.value)}
            className="mb-4 max-w-sm"
          />
          {leaderboard.length === 0 ? (
            <EmptyState icon={<Trophy size={20} />} title="No members" description="Add members to your roster first." />
          ) : (
            <div className="space-y-2">
              {leaderboard.map((m, i) => {
                const eligible = m.pts >= eligibilityMin;
                return (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-greek-200 transition-colors">
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
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {tab === "activity" && (
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
                    <p className="text-muted-foreground text-xs">{e.reason ?? "—"}</p>
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
