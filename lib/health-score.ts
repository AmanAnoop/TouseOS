/**
 * Computes organization health score from live org metrics.
 * Metrics without real data are excluded (not defaulted to 100).
 */

import { REQUIRED_SPORTS_WAIVER_KEYS } from "@/lib/sports-waiver-types";

export interface HealthScoreInput {
  members: Array<{ membership_status: string; payment_status: string; attendance_rate: number; forms_completed: number; forms_required: number }>;
  payments: Array<{ amount: number; paid_amount: number; status: string }>;
  pnmLeads: Array<{ status: string }>;
  events: Array<{ id: string }>;
  rsvps: Array<{ checked_in: boolean; event_id: string }>;
  tasks: Array<{ status: string }>;
  reimbursements: Array<{ status: string; created_at: string }>;
  budgets: Array<{ budget_lines?: Array<{ budgeted: number; actual: number; type: string }> }>;
  waivers?: Array<{ status: string; waiver_type?: string; member_id?: string }>;
  orgType: string;
  activeMemberCount?: number;
}

export type HealthMetricKey =
  | "duesCollection"
  | "recruitmentConversion"
  | "eventAttendance"
  | "memberRetention"
  | "officerTaskCompletion"
  | "budgetHealth"
  | "complianceForms"
  | "reimbursementHealth"
  | "waiverCompletion";

export interface HealthMetricResult {
  score: number;
  hasData: boolean;
  detail?: string;
}

export interface HealthScoreBreakdown {
  duesCollection?: number;
  recruitmentConversion?: number;
  eventAttendance?: number;
  memberRetention?: number;
  officerTaskCompletion?: number;
  budgetHealth?: number;
  complianceForms?: number;
  reimbursementHealth?: number;
  waiverCompletion?: number;
}

export type HealthScoreMeta = Record<HealthMetricKey, HealthMetricResult>;

const WEIGHTS: Record<HealthMetricKey, number> = {
  duesCollection: 0.2,
  recruitmentConversion: 0.15,
  eventAttendance: 0.15,
  memberRetention: 0.1,
  officerTaskCompletion: 0.1,
  budgetHealth: 0.1,
  complianceForms: 0.1,
  reimbursementHealth: 0.05,
  waiverCompletion: 0.1,
};

const SPORTS_WEIGHTS: Partial<Record<HealthMetricKey, number>> = {
  recruitmentConversion: 0.05,
  waiverCompletion: 0.12,
};

function buildMeta(
  key: HealthMetricKey,
  score: number,
  hasData: boolean,
  detail?: string,
): HealthMetricResult {
  return { score, hasData, detail };
}

export function computeHealthScore(input: HealthScoreInput): {
  breakdown: HealthScoreBreakdown;
  meta: HealthScoreMeta;
  composite: number | null;
  metricsUsed: number;
  metricsTotal: number;
} {
  const activeMembers = input.members.filter((m) =>
    ["active", "new_member"].includes(m.membership_status),
  );
  const activeCount = input.activeMemberCount ?? activeMembers.length;

  const meta = {} as HealthScoreMeta;
  const breakdown: HealthScoreBreakdown = {};

  const totalExpected = input.payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalCollected = input.payments.reduce((s, p) => s + Number(p.paid_amount), 0);
  if (totalExpected > 0) {
    const score = Math.round((totalCollected / totalExpected) * 100);
    breakdown.duesCollection = score;
    meta.duesCollection = buildMeta("duesCollection", score, true, `${Math.round(totalCollected)}/${Math.round(totalExpected)} collected`);
  } else {
    meta.duesCollection = buildMeta("duesCollection", 0, false, "No dues charges yet");
  }

  const pnmTotal = input.pnmLeads.filter((p) => p.status !== "removed").length;
  if (pnmTotal > 0) {
    const pnmAccepted = input.pnmLeads.filter((p) => p.status === "accepted").length;
    const score = Math.round((pnmAccepted / pnmTotal) * 100);
    breakdown.recruitmentConversion = score;
    meta.recruitmentConversion = buildMeta("recruitmentConversion", score, true, `${pnmAccepted}/${pnmTotal} accepted`);
  } else if (input.orgType === "fraternity" || input.orgType === "sorority") {
    meta.recruitmentConversion = buildMeta("recruitmentConversion", 0, false, "No PNM leads tracked");
  }

  const totalRsvps = input.rsvps.length;
  if (totalRsvps > 0) {
    const checkedIn = input.rsvps.filter((r) => r.checked_in).length;
    const score = Math.round((checkedIn / totalRsvps) * 100);
    breakdown.eventAttendance = score;
    meta.eventAttendance = buildMeta("eventAttendance", score, true, `${checkedIn}/${totalRsvps} check-ins`);
  } else if (input.events.length > 0) {
    meta.eventAttendance = buildMeta("eventAttendance", 0, false, "No RSVPs yet");
  } else {
    meta.eventAttendance = buildMeta("eventAttendance", 0, false, "No events scheduled");
  }

  if (input.members.length > 0) {
    const score = Math.round((activeMembers.length / input.members.length) * 100);
    breakdown.memberRetention = score;
    meta.memberRetention = buildMeta("memberRetention", score, true, `${activeMembers.length}/${input.members.length} active`);
  } else {
    meta.memberRetention = buildMeta("memberRetention", 0, false, "No members on roster");
  }

  const openTasks = input.tasks.filter((t) => !["done", "cancelled"].includes(t.status)).length;
  const doneTasks = input.tasks.filter((t) => t.status === "done").length;
  const totalTasks = openTasks + doneTasks;
  if (totalTasks > 0) {
    const score = Math.round((doneTasks / totalTasks) * 100);
    breakdown.officerTaskCompletion = score;
    meta.officerTaskCompletion = buildMeta("officerTaskCompletion", score, true, `${doneTasks}/${totalTasks} done`);
  } else {
    meta.officerTaskCompletion = buildMeta("officerTaskCompletion", 0, false, "No tasks created");
  }

  const lines = input.budgets.flatMap((b) => b.budget_lines ?? []);
  const expenseLines = lines.filter((l) => l.type === "expense" && Number(l.budgeted) > 0);
  if (expenseLines.length > 0) {
    const withinBudget = expenseLines.filter((l) => Number(l.actual) <= Number(l.budgeted)).length;
    const score = Math.round((withinBudget / expenseLines.length) * 100);
    breakdown.budgetHealth = score;
    meta.budgetHealth = buildMeta("budgetHealth", score, true, `${withinBudget}/${expenseLines.length} lines on budget`);
  } else if (lines.length > 0) {
    meta.budgetHealth = buildMeta("budgetHealth", 0, false, "Set budgeted amounts on expense lines");
  } else {
    meta.budgetHealth = buildMeta("budgetHealth", 0, false, "No budget created");
  }

  const membersNeedingForms = activeMembers.filter((m) => m.forms_required > 0);
  if (membersNeedingForms.length > 0) {
    const complete = membersNeedingForms.filter((m) => m.forms_completed >= m.forms_required).length;
    const score = Math.round((complete / membersNeedingForms.length) * 100);
    breakdown.complianceForms = score;
    meta.complianceForms = buildMeta("complianceForms", score, true, `${complete}/${membersNeedingForms.length} members complete`);
  } else if (activeCount > 0) {
    meta.complianceForms = buildMeta("complianceForms", 0, false, "No required forms configured");
  }

  const now = Date.now();
  const pendingReimbs = input.reimbursements.filter((r) =>
    ["submitted", "needs_info"].includes(r.status),
  );
  const agingPending = pendingReimbs.filter(
    (r) => now - new Date(r.created_at).getTime() > 14 * 86400000,
  ).length;
  const score = Math.max(0, 100 - agingPending * 15);
  breakdown.reimbursementHealth = score;
  meta.reimbursementHealth = buildMeta(
    "reimbursementHealth",
    score,
    true,
    pendingReimbs.length === 0
      ? "No pending reimbursements"
      : `${pendingReimbs.length} pending (${agingPending} over 14 days)`,
  );

  if (input.orgType === "club_sports" && input.waivers) {
    const required = REQUIRED_SPORTS_WAIVER_KEYS;
    const totalRequired = activeCount * required.length;
    if (totalRequired > 0) {
      const completed = input.waivers.filter(
        (w) => w.status === "completed" && required.includes(String(w.waiver_type ?? "") as typeof required[number]),
      ).length;
      const score = Math.round((completed / totalRequired) * 100);
      breakdown.waiverCompletion = score;
      meta.waiverCompletion = buildMeta("waiverCompletion", score, true, `${completed}/${totalRequired} required waivers`);
    } else {
      meta.waiverCompletion = buildMeta("waiverCompletion", 0, false, "No active players");
    }
  }

  const weights = { ...WEIGHTS, ...(input.orgType === "club_sports" || input.orgType === "general_org" ? SPORTS_WEIGHTS : {}) };
  if (input.orgType === "club_sports" || input.orgType === "general_org") {
    weights.recruitmentConversion = 0.05;
  }

  let composite = 0;
  let weightSum = 0;
  let metricsUsed = 0;
  let metricsTotal = 0;

  for (const key of Object.keys(meta) as HealthMetricKey[]) {
    const m = meta[key];
    metricsTotal += 1;
    if (!m.hasData) continue;
    metricsUsed += 1;
    const w = weights[key] ?? 0;
    if (w > 0 && breakdown[key] !== undefined) {
      composite += breakdown[key]! * w;
      weightSum += w;
    }
  }

  const finalComposite = weightSum > 0 ? Math.round(composite / weightSum) : null;

  return {
    breakdown,
    meta,
    composite: finalComposite,
    metricsUsed,
    metricsTotal,
  };
}

export function healthScoreLabel(score: number | null): { label: string; color: "green" | "yellow" | "red" | "gray" } {
  if (score === null) return { label: "Insufficient data", color: "gray" };
  if (score >= 80) return { label: "Healthy", color: "green" };
  if (score >= 60) return { label: "Needs attention", color: "yellow" };
  return { label: "At risk", color: "red" };
}
