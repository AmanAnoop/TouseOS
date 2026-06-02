export interface BudgetLineForForecast {
  category: string;
  type: "income" | "expense";
  budgeted: number;
  actual: number;
}

export interface CashFlowMonth {
  month: string;
  label: string;
  projectedIncome: number;
  projectedExpense: number;
  net: number;
  cumulativeNet: number;
}

export interface CashFlowForecast {
  months: CashFlowMonth[];
  totalProjectedIncome: number;
  totalProjectedExpense: number;
  endingBalance: number;
  currentNet: number;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function computeCashFlowForecast(
  lines: BudgetLineForForecast[],
  monthsAhead = 6,
): CashFlowForecast {
  const incomeLines = lines.filter((l) => l.type === "income");
  const expenseLines = lines.filter((l) => l.type === "expense");

  const totalBudgetedIncome = incomeLines.reduce((s, l) => s + Number(l.budgeted), 0);
  const totalBudgetedExpense = expenseLines.reduce((s, l) => s + Number(l.budgeted), 0);
  const totalActualIncome = incomeLines.reduce((s, l) => s + Number(l.actual), 0);
  const totalActualExpense = expenseLines.reduce((s, l) => s + Number(l.actual), 0);
  const currentNet = totalActualIncome - totalActualExpense;

  const remainingIncome = Math.max(0, totalBudgetedIncome - totalActualIncome);
  const remainingExpense = Math.max(0, totalBudgetedExpense - totalActualExpense);

  const now = new Date();
  const months: CashFlowMonth[] = [];
  let cumulativeNet = currentNet;
  const futureMonths = monthsAhead - 1;

  for (let i = 0; i < monthsAhead; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;

    const projectedIncome = i === 0
      ? totalActualIncome
      : (futureMonths > 0 ? remainingIncome / futureMonths : 0);
    const projectedExpense = i === 0
      ? totalActualExpense
      : (futureMonths > 0 ? remainingExpense / futureMonths : 0);

    const net = projectedIncome - projectedExpense;
    if (i === 0) {
      cumulativeNet = currentNet;
    } else {
      cumulativeNet += net;
    }

    months.push({
      month: monthKey,
      label,
      projectedIncome: Math.round(projectedIncome * 100) / 100,
      projectedExpense: Math.round(projectedExpense * 100) / 100,
      net: Math.round(net * 100) / 100,
      cumulativeNet: Math.round(cumulativeNet * 100) / 100,
    });
  }

  const totalProjectedIncome = months.reduce((s, m) => s + m.projectedIncome, 0);
  const totalProjectedExpense = months.reduce((s, m) => s + m.projectedExpense, 0);

  return {
    months,
    totalProjectedIncome: Math.round(totalProjectedIncome * 100) / 100,
    totalProjectedExpense: Math.round(totalProjectedExpense * 100) / 100,
    endingBalance: Math.round(cumulativeNet * 100) / 100,
    currentNet: Math.round(currentNet * 100) / 100,
  };
}
