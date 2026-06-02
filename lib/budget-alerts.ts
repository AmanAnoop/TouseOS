export interface BudgetLine {
  id: string;
  category: string;
  type: "income" | "expense";
  description: string | null;
  budgeted: number;
  actual: number;
}

export interface BudgetAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
}

const THRESHOLDS = {
  categoryOverPct: 100,
  categoryWarningPct: 85,
  totalOverPct: 100,
  totalWarningPct: 80,
};

export function computeBudgetAlerts(lines: BudgetLine[]): BudgetAlert[] {
  const alerts: BudgetAlert[] = [];
  const expenseLines = lines.filter((l) => l.type === "expense");
  const incomeLines = lines.filter((l) => l.type === "income");

  const totalBudgetedExpense = expenseLines.reduce((s, l) => s + Number(l.budgeted), 0);
  const totalActualExpense = expenseLines.reduce((s, l) => s + Number(l.actual), 0);
  const totalBudgetedIncome = incomeLines.reduce((s, l) => s + Number(l.budgeted), 0);
  const totalActualIncome = incomeLines.reduce((s, l) => s + Number(l.actual), 0);

  if (totalBudgetedExpense > 0) {
    const usedPct = Math.round((totalActualExpense / totalBudgetedExpense) * 100);
    if (usedPct >= THRESHOLDS.totalOverPct) {
      alerts.push({
        id: "total-over",
        severity: "critical",
        title: "Budget exceeded",
        message: `Total expenses are at ${usedPct}% of the budget (${usedPct - 100}% over).`,
      });
    } else if (usedPct >= THRESHOLDS.totalWarningPct) {
      alerts.push({
        id: "total-warning",
        severity: "warning",
        title: "Approaching budget limit",
        message: `${usedPct}% of the expense budget has been spent.`,
      });
    }
  }

  if (totalBudgetedIncome > 0 && totalActualIncome < totalBudgetedIncome * 0.75) {
    const gapPct = Math.round((1 - totalActualIncome / totalBudgetedIncome) * 100);
    alerts.push({
      id: "income-shortfall",
      severity: "warning",
      title: "Income below target",
      message: `Income is ${gapPct}% below the budgeted target.`,
    });
  }

  for (const line of expenseLines) {
    const budgeted = Number(line.budgeted);
    const actual = Number(line.actual);
    if (budgeted <= 0) continue;
    const pct = Math.round((actual / budgeted) * 100);
    if (pct >= THRESHOLDS.categoryOverPct) {
      alerts.push({
        id: `over-${line.id}`,
        severity: "critical",
        title: `${line.category} over budget`,
        message: `Spent $${actual.toFixed(0)} of $${budgeted.toFixed(0)} budgeted (${pct}%).`,
      });
    } else if (pct >= THRESHOLDS.categoryWarningPct) {
      alerts.push({
        id: `warn-${line.id}`,
        severity: "warning",
        title: `${line.category} nearing limit`,
        message: `${pct}% of the ${line.category} budget used.`,
      });
    }
  }

  const netActual = totalActualIncome - totalActualExpense;
  if (netActual < 0) {
    alerts.push({
      id: "negative-net",
      severity: "info",
      title: "Negative net balance",
      message: `Current net is -$${Math.abs(netActual).toFixed(0)} for this period.`,
    });
  }

  return alerts.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });
}
