export interface PaymentSummary {
  id: string;
  amount: number;
  paid_amount: number;
  status: string;
  due_date: string | null;
  category: string | null;
}

export interface DuesForecastMonth {
  label: string;
  expected: number;
  collected: number;
  outstanding: number;
  collectionRate: number;
}

export interface DuesForecast {
  totalExpected: number;
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: number;
  overdueCount: number;
  pendingCount: number;
  months: DuesForecastMonth[];
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function computeDuesForecast(payments: PaymentSummary[]): DuesForecast {
  const duesPayments = payments.filter((p) => !p.category || p.category === "dues" || p.category === "fees");

  const totalExpected = duesPayments.reduce((s, p) => s + Number(p.amount), 0);
  const totalCollected = duesPayments.reduce((s, p) => s + Number(p.paid_amount), 0);
  const totalOutstanding = Math.max(0, totalExpected - totalCollected);
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
  const overdueCount = duesPayments.filter((p) => p.status === "overdue").length;
  const pendingCount = duesPayments.filter((p) => ["pending", "partial"].includes(p.status)).length;

  const now = new Date();
  const months: DuesForecastMonth[] = [];

  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const label = `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);

    const inMonth = duesPayments.filter((p) => {
      if (!p.due_date) return i === 0;
      const due = new Date(p.due_date);
      return due >= monthStart && due <= monthEnd;
    });

    const expected = inMonth.reduce((s, p) => s + Number(p.amount), 0);
    const collected = inMonth.reduce((s, p) => s + Number(p.paid_amount), 0);
    const outstanding = Math.max(0, expected - collected);

    months.push({
      label,
      expected: Math.round(expected * 100) / 100,
      collected: Math.round(collected * 100) / 100,
      outstanding: Math.round(outstanding * 100) / 100,
      collectionRate: expected > 0 ? Math.round((collected / expected) * 100) : 0,
    });
  }

  return {
    totalExpected: Math.round(totalExpected * 100) / 100,
    totalCollected: Math.round(totalCollected * 100) / 100,
    totalOutstanding: Math.round(totalOutstanding * 100) / 100,
    collectionRate,
    overdueCount,
    pendingCount,
    months,
  };
}

export interface BudgetSyncResult {
  updated: boolean;
  duesLineId?: string;
  previousActual?: number;
  newActual: number;
}

/** Sync collected dues from payments into the budget's "Dues income" line actual. */
export function computeDuesSyncActual(payments: PaymentSummary[]): number {
  return payments
    .filter((p) => !p.category || p.category === "dues" || p.category === "fees")
    .reduce((s, p) => s + Number(p.paid_amount), 0);
}
