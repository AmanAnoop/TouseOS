"use client";

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

export default function PaymentsPage() {
  const supabase = createClient();
  const [payments, setPayments] = useState<PaymentWithMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [charge, setCharge] = useState({ title: "", amount: "", category: "dues", dueDate: "" });
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ paymentId: "", amount: "", method: "cash", notes: "" });

  const loadPayments = useCallback(async (oid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("payments")
      .select("*, member_profiles(*)")
      .eq("org_id", oid)
      .order("due_date", { ascending: true });
    setPayments((data ?? []) as PaymentWithMember[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: m } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single();
      if (m) { setOrgId(m.org_id); loadPayments(m.org_id); }
    }
    init();
  }, [supabase, loadPayments]);

  const filtered = payments.filter((p) => filter === "all" || p.status === filter);

  const totalExpected = payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalCollected = payments.reduce((s, p) => s + Number(p.paid_amount), 0);
  const overdue = payments.filter((p) => p.status === "overdue");
  const pending = payments.filter((p) => p.status === "pending");
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  async function createCharge() {
    if (!orgId || !charge.title || !charge.amount) return;
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, ...charge }),
    });
    if (res.ok) {
      toast.success("Charge created");
      setCreateOpen(false);
      setCharge({ title: "", amount: "", category: "dues", dueDate: "" });
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
    const url = `${window.location.origin}/payments?token=${token ?? p.id}`;
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
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<Send size={14} />} onClick={sendReminders}>
              Send reminders
            </Button>
            <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={exportPayments}>
              Export
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setManualOpen(true)}>Log cash/check</Button>
            <a href="/payments/plan"><Button variant="secondary" size="sm">Payment plans</Button></a>
            <a href="/payments/hardship">
            <Button variant="secondary" size="sm">Hardship request</Button>
          </a>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
              New charge
            </Button>
          </div>
        }
      />

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
                ({payments.filter((p) => p.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Payments list */}
      {loading ? (
        <PaymentList payments={[]} loading />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<DollarSign size={24} />} title="No payments" description="Create a charge to get started." action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>New charge</Button>} />
      ) : (
        <PaymentList
          payments={filtered}
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
