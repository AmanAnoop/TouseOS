"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";

interface PlanRow {
  id: string;
  payment_id: string;
  installments: number;
  installment_amount: number;
  schedule: Array<{ installment: number; due_date: string; amount: number; status: string }>;
}

interface PaymentPlanPanelProps {
  orgId: string;
  memberId: string;
}

export function PaymentPlanPanel({ orgId, memberId }: PaymentPlanPanelProps) {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [plansRes, paymentsRes] = await Promise.all([
        fetch(`/api/payments/plans?org_id=${encodeURIComponent(orgId)}`),
        fetch(`/api/payments?org_id=${encodeURIComponent(orgId)}`),
      ]);
      if (!plansRes.ok) {
        setLoading(false);
        return;
      }
      const plansData = (await plansRes.json()) as PlanRow[];
      const payments = paymentsRes.ok
        ? (await paymentsRes.json()) as Array<{ id: string; member_id: string }>
        : [];
      const myPaymentIds = new Set(
        payments.filter((p) => p.member_id === memberId).map((p) => p.id),
      );
      setPlans(plansData.filter((plan) => myPaymentIds.has(plan.payment_id)));
      setLoading(false);
    }
    if (orgId && memberId) load();
  }, [orgId, memberId]);

  if (loading || plans.length === 0) return null;

  return (
    <Card>
      <CardHeader title="Active payment plan" description="Installment schedule on your dues" />
      {plans.map((plan) => (
        <div key={plan.id} className="space-y-2 p-4 border-t border-border">
          <p className="type-small" style={{ color: "var(--color-text-muted)", margin: 0 }}>
            {plan.installments} installments · {formatCurrency(Number(plan.installment_amount))} each
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {(plan.schedule ?? []).map((s) => (
              <li
                key={s.installment}
                className="type-small"
                style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", minHeight: 44, alignItems: "center" }}
              >
                <span>#{s.installment} · {formatDate(s.due_date)}</span>
                <span>{formatCurrency(s.amount)} · {s.status}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Card>
  );
}
