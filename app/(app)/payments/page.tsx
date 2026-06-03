"use client";

import Link from "next/link";

import { useState, useEffect, useCallback } from "react";
import { Download, DollarSign, Plus, Send } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import {
  Button, Card, CardHeader, EmptyState,
  Input, Modal, PageHeader, ProgressBar, Select,
} from "@/components/ui";
import { formatCurrency, downloadCsv } from "@/lib/utils";
import { PaymentStats } from "@/components/payments/payment-stats";
import { PaymentList, type PaymentWithMember } from "@/components/payments/payment-list";
import type { MemberProfile } from "@/types";
import { PaymentDetailModal } from "@/components/payments/payment-detail-modal";
import { MemberBalancesPanel, computeMemberBalances } from "@/components/payments/member-balances-panel";
import { TreasurerDashboard } from "@/components/payments/treasurer-dashboard";
import { HardshipReviewPanel } from "@/components/payments/hardship-review-panel";
import { StripeDestinationBanner } from "@/components/payments/stripe-destination-banner";
import { StripeReconciliationPanel } from "@/components/payments/stripe-reconciliation-panel";
import { can } from "@/lib/permissions";
import { useOrg } from "@/hooks/use-org";

export default function PaymentsPage() {
  const supabase = createClient();
  const { orgId, userId, role: myRole } = useOrg();
  const [payments, setPayments] = useState<PaymentWithMember[]>([]);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [planCount, setPlanCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [myMemberId, setMyMemberId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [charge, setCharge] = useState({ title: "", amount: "", category: "dues", dueDate: "", lateFee: "", recurring: false, recurringInterval: "semesterly" });
  const [manualOpen, setManualOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithMember | null>(null);
  const [manualForm, setManualForm] = useState({ paymentId: "", amount: "", method: "cash", notes: "" });

  const loadPayments = useCallback(async (oid: string) => {
    setLoading(true);
    const [paymentsRes, memberRes, plansRes] = await Promise.all([
      fetch(`/api/payments?org_id=${encodeURIComponent(oid)}`),
      fetch(`/api/members?org_id=${encodeURIComponent(oid)}`),
      fetch(`/api/payments/plans?org_id=${encodeURIComponent(oid)}`),
    ]);
    if (paymentsRes.ok) {
      setPayments((await paymentsRes.json()) as PaymentWithMember[]);
    } else {
      const err = await paymentsRes.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to load payments");
    }
    if (memberRes.ok) setMembers((await memberRes.json()) as MemberProfile[]);
    if (plansRes.ok) {
      const plans = await plansRes.json();
      setPlanCount(Array.isArray(plans) ? plans.length : 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!orgId || !userId) return;
    loadPayments(orgId);
    supabase
      .from("member_profiles")
      .select("id")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data: profile }) => {
        if (profile) setMyMemberId(profile.id);
      });
  }, [supabase, orgId, userId, loadPayments]);

  const canViewAll = can(myRole, "view_payments") || can(myRole, "manage_payments");
  const canManage = can(myRole, "manage_payments");

  const visiblePayments = canViewAll
    ? payments
    : payments.filter((p) => p.member_id === myMemberId);

  const filtered = visiblePayments.filter((p) => filter === "all" || p.status === filter);

  const totalExpected = visiblePayments.reduce((s, p) => s + Number(p.amount), 0);
  const totalCollected = visiblePayments.reduce((s, p) => s + Number(p.paid_amount), 0);
  const overdue = visiblePayments.filter((p) => p.status === "overdue");
  const pending = visiblePayments.filter((p) => p.status === "pending");
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  async function createCharge() {
    if (!orgId || !charge.title || !charge.amount) return;
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, title: charge.title, amount: charge.amount, category: charge.category, dueDate: charge.dueDate, lateFee: charge.lateFee }),
    });
    if (res.ok) {
      toast.success("Charge created");
      setCreateOpen(false);
      setCharge({ title: "", amount: "", category: "dues", dueDate: "", lateFee: "", recurring: false, recurringInterval: "semesterly" });
      loadPayments(orgId);
    } else toast.error("Failed to create charge");
  }

  async function sendReminders() {
    if (!orgId) return;
    const res = await fetch("/api/payments/remind", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId }),
    });
    const data = await res.json();
    toast.success(data.message ?? "Reminders sent");
  }

  async function logManualPayment() {
    if (!orgId || !manualForm.paymentId || !manualForm.amount) return;
    const res = await fetch("/api/payments/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, ...manualForm, amount: parseFloat(manualForm.amount) }),
    });
    if (res.ok) {
      toast.success("Payment logged");
      setManualOpen(false);
      setManualForm({ paymentId: "", amount: "", method: "cash", notes: "" });
      loadPayments(orgId);
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed");
    }
  }

  function copyParentLink(p: PaymentWithMember) {
    const token = (p as PaymentWithMember & { parent_pay_token?: string }).parent_pay_token;
    const url = `${window.location.origin}/pay/${token ?? p.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Parent payment link copied");
  }

  function exportPayments() {
    downloadCsv("payments.csv", filtered.map((p) => ({
      Member: p.member_profiles?.full_name ?? "—",
      Email: p.member_profiles?.email ?? "—",
      Amount: p.amount,
      "Paid Amount": p.paid_amount,
      Status: p.status,
      "Due Date": p.due_date ?? "",
      "Paid At": p.paid_at ?? "",
      Method: p.method,
    })));
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dues & Payments"
        description="Track collections, create charges, and send reminders"
        action={
          <div className="flex gap-2 flex-wrap">
            {canManage && (
              <>
                <Button variant="secondary" size="sm" className="officer-touch" icon={<Send size={14} />} onClick={sendReminders}>
                  Send reminders
                </Button>
                <Button variant="secondary" size="sm" className="officer-touch" onClick={() => setManualOpen(true)}>Log cash/check</Button>
                <Button size="sm" className="officer-touch" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
                  New charge
                </Button>
              </>
            )}
            <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={exportPayments}>
              Export
            </Button>
            <Link href="/payments/plan"><Button variant="secondary" size="sm">Payment plans</Button></Link>
            {can(myRole, "manage_budget") && (
              <>
                <Link href="/budget"><Button variant="secondary" size="sm">Budget</Button></Link>
                <Link href="/reimbursements"><Button variant="secondary" size="sm">Reimbursements</Button></Link>
              </>
            )}
            <a href="/payments/hardship">
              <Button variant="secondary" size="sm">Hardship request</Button>
            </a>
          </div>
        }
      />

      {orgId && canManage && (
        <>
          <StripeDestinationBanner orgId={orgId} />
          <StripeReconciliationPanel orgId={orgId} />
        </>
      )}

      {!canViewAll && (
        <Card>
          <p className="text-sm text-muted-foreground">
            You are viewing your own payment history. Contact your treasurer for chapter-wide collections.
          </p>
        </Card>
      )}

      {canManage && (
        <>
          <TreasurerDashboard payments={payments} planCount={planCount} />
          <MemberBalancesPanel rows={computeMemberBalances(members, payments)} />
          <HardshipReviewPanel orgId={orgId} />
        </>
      )}

      <PaymentStats
        totalExpected={totalExpected}
        totalCollected={totalCollected}
        pendingCount={pending.length}
        overdueCount={overdue.length}
      />

      <Card>
        <CardHeader title="Collection progress" />
        <ProgressBar
          value={collectionRate}
          label={`${formatCurrency(totalCollected)} of ${formatCurrency(totalExpected)}`}
          color={collectionRate >= 75 ? "green" : collectionRate >= 50 ? "yellow" : "red"}
          size="md"
        />
      </Card>

      {/* Filter */}
      <div className="flex gap-2">
        {["all","pending","overdue","paid","failed"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${filter === s ? "bg-greek-600 text-white" : "bg-surface-1 text-muted-foreground hover:text-foreground"}`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            {s !== "all" && (
              <span className="ml-1 text-xs opacity-70">
                ({visiblePayments.filter((p) => p.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Payments list */}
      {loading ? (
        <PaymentList payments={[]} loading />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<DollarSign size={24} />} title="No payments" description="Create a charge to get started." action={canManage ? <Button size="sm" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>New charge</Button> : undefined} />
      ) : (
        <PaymentList
          payments={filtered}
          onSelect={(p) => setSelectedPayment(p)}
          onCopyParentLink={copyParentLink}
          onPayStripe={async (p) => {
            const res = await fetch("/api/stripe/checkout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ paymentId: p.id, email: p.member_profiles?.email }),
            });
            const { url } = await res.json();
            if (url) window.open(url, "_blank");
          }}
        />
      )}

      {/* Create charge modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create charge"
        description="Assign a payment to all or specific members."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createCharge} disabled={!charge.title || !charge.amount}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Title</label>
            <input
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. Spring semester dues"
              value={charge.title}
              onChange={(e) => setCharge({ ...charge, title: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Amount ($)</label>
              <input
                type="number"
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="150.00"
                value={charge.amount}
                onChange={(e) => setCharge({ ...charge, amount: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Due date</label>
              <input
                type="date"
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={charge.dueDate}
                onChange={(e) => setCharge({ ...charge, dueDate: e.target.value })}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={charge.recurring}
              onChange={(e) => setCharge({ ...charge, recurring: e.target.checked })}
              className="rounded border-border"
            />
            Recurring charge (auto-generate on schedule via cron)
          </label>
          {charge.recurring && (
            <Select
              label="Interval"
              value={charge.recurringInterval}
              onChange={(e) => setCharge({ ...charge, recurringInterval: e.target.value })}
              options={[
                { value: "monthly", label: "Monthly" },
                { value: "semesterly", label: "Each semester" },
                { value: "annually", label: "Annually" },
              ]}
            />
          )}
          <Input
              label="Late fee ($) — applied if overdue"
              type="number"
              placeholder="0"
              value={charge.lateFee}
              onChange={(e) => setCharge({ ...charge, lateFee: e.target.value })}
            />
          <Select
            label="Category"
            value={charge.category}
            onChange={(e) => setCharge({ ...charge, category: e.target.value })}
            options={[
              { value: "dues", label: "Chapter dues" },
              { value: "national_dues", label: "National dues" },
              { value: "social_fees", label: "Social fees" },
              { value: "formal_fees", label: "Formal fees" },
              { value: "philanthropy", label: "Philanthropy tickets" },
              { value: "merchandise", label: "Merchandise" },
              { value: "team_dues", label: "Team dues" },
              { value: "travel", label: "Travel deposit" },
              { value: "tournament", label: "Tournament fees" },
              { value: "uniforms", label: "Uniform payment" },
              { value: "other", label: "Other" },
            ]}
          />
        </div>
      </Modal>



      <PaymentDetailModal
        open={Boolean(selectedPayment)}
        onClose={() => setSelectedPayment(null)}
        orgId={orgId}
        payment={selectedPayment}
        canManage={canManage}
        onRefresh={() => orgId && loadPayments(orgId)}
      />

      <Modal open={manualOpen} onClose={() => setManualOpen(false)} title="Log manual payment" description="Record cash, check, or Venmo payment" footer={<><Button variant="secondary" onClick={() => setManualOpen(false)}>Cancel</Button><Button onClick={logManualPayment}>Log payment</Button></>}>
        <div className="space-y-3">
          <Select label="Payment" value={manualForm.paymentId} onChange={(e) => setManualForm({ ...manualForm, paymentId: e.target.value })} options={payments.filter((p) => p.status !== "paid").map((p) => ({ value: p.id, label: `${p.member_profiles?.full_name ?? "Member"} — ${p.amount}` }))} placeholder="Select payment" />
          <Input label="Amount received ($)" type="number" value={manualForm.amount} onChange={(e) => setManualForm({ ...manualForm, amount: e.target.value })} />
          <Select label="Method" value={manualForm.method} onChange={(e) => setManualForm({ ...manualForm, method: e.target.value })} options={[{ value: "cash", label: "Cash" }, { value: "check", label: "Check" }, { value: "venmo", label: "Venmo/Zelle" }]} />
          <Input label="Notes" value={manualForm.notes} onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
