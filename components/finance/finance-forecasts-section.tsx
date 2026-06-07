"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";
import { CashFlowForecastPanel } from "@/components/budget/cash-flow-forecast";
import { DuesForecastPanel } from "@/components/budget/dues-forecast-panel";
import { computeCashFlowForecast } from "@/lib/cash-flow-forecast";
import { computeDuesForecast, type PaymentSummary } from "@/lib/dues-forecast";
import { activeBudgets, normalizeBudgetList, type BudgetRecord } from "@/lib/budget-api";

interface FinanceForecastsSectionProps {
  orgId: string;
  /** When true, only show charts (forecasts tab). When false, compact preview on overview. */
  fullPage?: boolean;
  onCreateBudget?: () => void;
}

export function FinanceForecastsSection({
  orgId,
  fullPage = false,
  onCreateBudget,
}: FinanceForecastsSectionProps) {
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState<BudgetRecord | null>(null);
  const [payments, setPayments] = useState<PaymentSummary[]>([]);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [budgetRes, paymentsRes] = await Promise.all([
      fetch(`/api/budget?org_id=${encodeURIComponent(orgId)}`),
      fetch(`/api/payments?org_id=${encodeURIComponent(orgId)}`),
    ]);
    if (budgetRes.ok) {
      const list = normalizeBudgetList(await budgetRes.json());
      setBudget(activeBudgets(list)[0] ?? null);
    } else {
      setBudget(null);
    }
    if (paymentsRes.ok) {
      const raw = (await paymentsRes.json()) as Array<{
        id: string;
        amount: number;
        paid_amount: number;
        status: string;
        due_date: string | null;
        payment_items?: { category?: string } | { category?: string }[] | null;
      }>;
      setPayments(raw.map((p) => {
        const item = Array.isArray(p.payment_items) ? p.payment_items[0] : p.payment_items;
        return {
          id: p.id,
          amount: p.amount,
          paid_amount: p.paid_amount,
          status: p.status,
          due_date: p.due_date,
          category: item?.category ?? null,
        };
      }));
    }
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  async function syncBudget() {
    if (!budget?.id) return;
    setSyncing(true);
    await fetch("/api/budget/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, budgetId: budget.id }),
    });
    setSyncing(false);
    await load();
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground py-4">Loading forecasts…</p>;
  }

  if (!budget) {
    return (
      <EmptyState
        icon={<Plus size={24} />}
        title="No budget yet"
        description="Create a semester budget to unlock cash-flow and dues forecast charts."
        action={(
          <div className="flex flex-wrap gap-2 justify-center">
            {onCreateBudget ? (
              <Button size="sm" onClick={onCreateBudget}>Create budget</Button>
            ) : (
              <Link href="/finance?tab=budget">
                <Button size="sm">Go to budget lines</Button>
              </Link>
            )}
          </div>
        )}
      />
    );
  }

  const lines = budget.budget_lines ?? [];
  const cashFlow = computeCashFlowForecast(lines);
  const dues = computeDuesForecast(payments);

  return (
    <div className="space-y-8">
      {!fullPage && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="font-semibold text-foreground">Forecasts & charts</h3>
            <p className="text-sm text-muted-foreground">{budget.label}</p>
          </div>
          <Link href="/finance?tab=forecasts" className="text-sm text-primary hover:underline">
            Expand forecasts →
          </Link>
        </div>
      )}
      <CashFlowForecastPanel forecast={cashFlow} />
      <DuesForecastPanel forecast={dues} onSyncToBudget={syncBudget} syncing={syncing} />
    </div>
  );
}
