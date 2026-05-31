/**
 * Computes organization health score from live org metrics.
 * Each component is 0–100; composite is weighted average.
 */

export interface HealthScoreInput {
  members: Array<{ membership_status: string; payment_status: string; attendance_rate: number; forms_completed: number; forms_required: number }>;
  payments: Array<{ amount: number; paid_amount: number; status: string }>;
  pnmLeads: Array<{ status: string }>;
  events: Array<{ id: string }>;
  rsvps: Array<{ checked_in: boolean; event_id: string }>;
  tasks: Array<{ status: string }>;
  reimbursements: Array<{ status: string; created_at: string }>;
  budgets: Array<{ budget_lines?: Array<{ budgeted: number; actual: number; type: string }> }>;
  waivers?: Array<{ status: string }>;
  orgType: string;
}

export interface HealthScoreBreakdown {
  duesCollection: number;
  recruitmentConversion: number;
  eventAttendance: number;
  memberRetention: number;
  officerTaskCompletion: number;
  budgetHealth: number;
  complianceForms: number;
  reimbursementHealth: number;
  waiverCompletion?: number;
}

export function computeHealthScore(input: HealthScoreInput): {
  breakdown: HealthScoreBreakdown;
  composite: number;
} {
  const activeMembers = input.members.filter((m) =>
    ["active", "new_member"].includes(m.membership_status),
  );

  // Dues collection
  const totalExpected = input.payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalCollected = input.payments.reduce((s, p) => s + Number(p.paid_amount), 0);
  const duesCollection = totalExpected > 0
    ? Math.round((totalCollected / totalExpected) * 100)
    : 100;

  // PNM conversion (accepted / total non-removed)
  const pnmTotal = input.pnmLeads.filter((p) => p.status !== "removed").length;
  const pnmAccepted = input.pnmLeads.filter((p) => p.status === "accepted").length;
  const recruitmentConversion = pnmTotal > 0
    ? Math.round((pnmAccepted / pnmTotal) * 100)
    : 75;

  // Event attendance rate
  const totalRsvps = input.rsvps.length;
  const checkedIn = input.rsvps.filter((r) => r.checked_in).length;
  const eventAttendance = totalRsvps > 0
    ? Math.round((checkedIn / totalRsvps) * 100)
    : 80;

  // Member retention (active vs total)
  const memberRetention = input.members.length > 0
    ? Math.round((activeMembers.length / input.members.length) * 100)
    : 100;

  // Officer task completion
  const openTasks = input.tasks.filter((t) => !["done", "cancelled"].includes(t.status)).length;
  const doneTasks = input.tasks.filter((t) => t.status === "done").length;
  const totalTasks = openTasks + doneTasks;
  const officerTaskCompletion = totalTasks > 0
    ? Math.round((doneTasks / totalTasks) * 100)
    : 90;

  // Budget health (expenses within budget)
  let budgetHealth = 85;
  const lines = input.budgets.flatMap((b) => b.budget_lines ?? []);
  if (lines.length > 0) {
    const expenseLines = lines.filter((l) => l.type === "expense" && Number(l.budgeted) > 0);
    if (expenseLines.length > 0) {
      const withinBudget = expenseLines.filter((l) => Number(l.actual) <= Number(l.budgeted)).length;
      budgetHealth = Math.round((withinBudget / expenseLines.length) * 100);
    }
  }

  // Forms compliance
  const membersNeedingForms = activeMembers.filter((m) => m.forms_required > 0);
  const complianceForms = membersNeedingForms.length > 0
    ? Math.round(
        (membersNeedingForms.filter((m) => m.forms_completed >= m.forms_required).length /
          membersNeedingForms.length) *
          100,
      )
    : 100;

  // Reimbursement aging (pending > 14 days hurts score)
  const now = Date.now();
  const agingPending = input.reimbursements.filter(
    (r) =>
      ["submitted", "needs_info"].includes(r.status) &&
      now - new Date(r.created_at).getTime() > 14 * 86400000,
  ).length;
  const reimbursementHealth = Math.max(0, 100 - agingPending * 15);

  const breakdown: HealthScoreBreakdown = {
    duesCollection,
    recruitmentConversion,
    eventAttendance,
    memberRetention,
    officerTaskCompletion,
    budgetHealth,
    complianceForms,
    reimbursementHealth,
  };

  if (input.orgType === "club_sports" && input.waivers) {
    const total = input.waivers.length;
    const completed = input.waivers.filter((w) => w.status === "completed").length;
    breakdown.waiverCompletion = total > 0 ? Math.round((completed / total) * 100) : 100;
  }

  const weights: Record<keyof HealthScoreBreakdown, number> = {
    duesCollection: 0.2,
    recruitmentConversion: input.orgType === "club_sports" ? 0.05 : 0.15,
    eventAttendance: 0.15,
    memberRetention: 0.1,
    officerTaskCompletion: 0.1,
    budgetHealth: 0.1,
    complianceForms: 0.1,
    reimbursementHealth: 0.05,
    waiverCompletion: 0.1,
  };

  let composite = 0;
  let weightSum = 0;
  for (const [key, weight] of Object.entries(weights) as [keyof HealthScoreBreakdown, number][]) {
    const val = breakdown[key];
    if (val !== undefined) {
      composite += val * weight;
      weightSum += weight;
    }
  }
  composite = weightSum > 0 ? Math.round(composite / weightSum) : 0;

  return { breakdown, composite };
}

export function healthScoreLabel(score: number): { label: string; color: "green" | "yellow" | "red" } {
  if (score >= 80) return { label: "Healthy", color: "green" };
  if (score >= 60) return { label: "Needs attention", color: "yellow" };
  return { label: "At risk", color: "red" };
}
