export interface ReimbursementAgingRow {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  submitted_by_name: string | null;
  category: string;
}

export interface ReimbursementAgingAlert {
  id: string;
  severity: "critical" | "warning";
  title: string;
  message: string;
  count: number;
  totalAmount: number;
}

const MS_PER_DAY = 86400000;

export function computeReimbursementAgingAlerts(
  rows: ReimbursementAgingRow[],
  warningDays = 7,
  criticalDays = 14,
): ReimbursementAgingAlert[] {
  const now = Date.now();
  const pending = rows.filter((r) => ["submitted", "needs_info"].includes(r.status));
  const alerts: ReimbursementAgingAlert[] = [];

  const warning = pending.filter((r) => {
    const age = (now - new Date(r.created_at).getTime()) / MS_PER_DAY;
    return age >= warningDays && age < criticalDays;
  });
  const critical = pending.filter((r) => {
    const age = (now - new Date(r.created_at).getTime()) / MS_PER_DAY;
    return age >= criticalDays;
  });

  if (critical.length > 0) {
    const totalAmount = critical.reduce((s, r) => s + Number(r.amount), 0);
    alerts.push({
      id: "reimb-critical",
      severity: "critical",
      title: "Reimbursements overdue for review",
      message: `${critical.length} request${critical.length > 1 ? "s" : ""} pending ${criticalDays}+ days ($${totalAmount.toFixed(0)} total).`,
      count: critical.length,
      totalAmount,
    });
  }

  if (warning.length > 0) {
    const totalAmount = warning.reduce((s, r) => s + Number(r.amount), 0);
    alerts.push({
      id: "reimb-warning",
      severity: "warning",
      title: "Reimbursements aging",
      message: `${warning.length} request${warning.length > 1 ? "s" : ""} waiting ${warningDays}+ days ($${totalAmount.toFixed(0)} total).`,
      count: warning.length,
      totalAmount,
    });
  }

  return alerts;
}
