"use client";

import { BookOpen, DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { StatCard, ProgressBar, Card, CardHeader } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

interface BudgetOverviewProps {
  totalActualIncome: number;
  totalBudgetedIncome: number;
  totalActualExpense: number;
  totalBudgetedExpense: number;
  netActual: number;
  budgetUsedPct: number;
}

export function BudgetOverview({
  totalActualIncome,
  totalBudgetedIncome,
  totalActualExpense,
  totalBudgetedExpense,
  netActual,
  budgetUsedPct,
}: BudgetOverviewProps) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total income"
          value={formatCurrency(totalActualIncome)}
          delta={`of ${formatCurrency(totalBudgetedIncome)}`}
          deltaType={totalActualIncome >= totalBudgetedIncome ? "up" : "neutral"}
          icon={<TrendingUp size={18} />}
        />
        <StatCard
          title="Total expenses"
          value={formatCurrency(totalActualExpense)}
          delta={`of ${formatCurrency(totalBudgetedExpense)}`}
          icon={<TrendingDown size={18} />}
        />
        <StatCard
          title="Net balance"
          value={formatCurrency(netActual)}
          deltaType={netActual >= 0 ? "up" : "down"}
          icon={<DollarSign size={18} />}
        />
        <StatCard
          title="Budget used"
          value={`${budgetUsedPct}%`}
          deltaType={budgetUsedPct > 100 ? "down" : "neutral"}
          icon={<BookOpen size={18} />}
        />
      </div>

      <Card>
        <CardHeader title="Expense budget utilization" />
        <ProgressBar
          value={budgetUsedPct}
          color={budgetUsedPct > 100 ? "red" : budgetUsedPct > 80 ? "yellow" : "green"}
          size="md"
          label={`${formatCurrency(totalActualExpense)} spent of ${formatCurrency(totalBudgetedExpense)} budgeted`}
        />
      </Card>
    </>
  );
}
