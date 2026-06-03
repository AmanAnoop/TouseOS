"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, Calendar, CreditCard } from "lucide-react";
import toast from "react-hot-toast";
import { useOrg } from "@/hooks/use-org";
import {
  Alert, Badge, Button, Card, EmptyState,
  Modal, PageHeader, Select,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Payment, MemberProfile } from "@/types";

type PaymentWithMember = Payment & { member_profiles: MemberProfile | null };

interface PaymentPlanRow {
  id: string;
  payment_id: string;
  installments: number;
  installment_amount: number;
  schedule: Array<{ installment: number; due_date: string; amount: number; status: string }>;
  created_at: string;
  payments: PaymentWithMember | null;
}

export default function PaymentPlansPage() {
  const { orgId } = useOrg();
  const [plans, setPlans] = useState<PaymentPlanRow[]>([]);
  const [eligible, setEligible] = useState<PaymentWithMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState("");
  const [installments, setInstallments] = useState("3");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const [plansRes, paymentsRes] = await Promise.all([
      fetch(`/api/payments/plans?org_id=${oid}`),
      fetch(`/api/payments?org_id=${encodeURIComponent(oid)}`),
    ]);

    if (plansRes.ok) setPlans(await plansRes.json());
    if (paymentsRes.ok) {
      const payments = (await paymentsRes.json()) as PaymentWithMember[];
      setEligible(
        payments.filter((p) => ["pending", "overdue", "partial"].includes(String(p.status))),
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (orgId) load(orgId);
  }, [orgId, load]);

  async function createPlan() {
    if (!selectedPaymentId || !orgId) return;
    setCreating(true);
    const res = await fetch("/api/payments/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId: selectedPaymentId, installments: parseInt(installments, 10) }),
    });
    setCreating(false);
    if (res.ok) {
      toast.success("Payment plan created");
      setCreateOpen(false);
      setSelectedPaymentId("");
      load(orgId);
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed to create plan");
    }
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <Link href="/payments" className="p-2 rounded-lg hover:bg-surface-1 text-muted-foreground">
          <ChevronLeft size={18} />
        </Link>
        <PageHeader
          title="Payment plans"
          description="Split outstanding balances into installment schedules"
          action={
            <Button size="sm" icon={<CreditCard size={14} />} onClick={() => setCreateOpen(true)} disabled={eligible.length === 0}>
              New plan
            </Button>
          }
        />
      </div>

      <Alert
        type="info"
        title="For members who need flexibility"
        description="Create installment plans for outstanding dues. Schedules are shared with the member and tracked by the treasurer."
      />

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-surface-2 rounded-xl animate-pulse" />)}
        </div>
      ) : plans.length === 0 ? (
        <EmptyState
          icon={<Calendar size={24} />}
          title="No payment plans yet"
          description="Create a plan for a member with an outstanding balance."
          action={
            eligible.length > 0 ? (
              <Button size="sm" onClick={() => setCreateOpen(true)}>Create first plan</Button>
            ) : (
              <Link href="/payments"><Button size="sm" variant="secondary">View payments</Button></Link>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => {
            const payment = plan.payments as PaymentWithMember | null;
            const schedule = Array.isArray(plan.schedule) ? plan.schedule : [];
            return (
              <Card key={plan.id} padding="sm">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                  <div>
                    <p className="font-semibold text-sm">{payment?.member_profiles?.full_name ?? "Member"}</p>
                    <p className="text-xs text-muted-foreground">
                      {plan.installments} installments · {formatCurrency(plan.installment_amount)}/mo avg
                    </p>
                  </div>
                  <Badge label={payment?.status ?? "active"} color="blue" />
                </div>
                <div className="space-y-1.5">
                  {schedule.map((s) => (
                    <div key={s.installment} className="flex items-center justify-between text-sm py-1 border-b border-border last:border-0">
                      <span className="text-muted-foreground">Installment {s.installment} · {formatDate(s.due_date)}</span>
                      <span className="font-medium">{formatCurrency(s.amount)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create payment plan"
        description="Split an outstanding balance into monthly installments"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createPlan} loading={creating} disabled={!selectedPaymentId}>Create plan</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Outstanding payment"
            value={selectedPaymentId}
            onChange={(e) => setSelectedPaymentId(e.target.value)}
            options={eligible.map((p) => ({
              value: p.id,
              label: `${p.member_profiles?.full_name ?? "Member"} — ${formatCurrency(Number(p.amount) - Number(p.paid_amount))} remaining`,
            }))}
            placeholder="Select payment"
          />
          <Select
            label="Number of installments"
            value={installments}
            onChange={(e) => setInstallments(e.target.value)}
            options={[
              { value: "2", label: "2 months" },
              { value: "3", label: "3 months" },
              { value: "4", label: "4 months" },
              { value: "6", label: "6 months" },
            ]}
          />
        </div>
      </Modal>
    </div>
  );
}
