"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, CreditCard, DollarSign, X } from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, Card, Modal, Select, Input } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Payment, MemberProfile } from "@/types";

export type PaymentWithMember = Payment & { member_profiles: MemberProfile | null };

interface PaymentDetailModalProps {
  open: boolean;
  onClose: () => void;
  orgId: string | null;
  payment: PaymentWithMember | null;
  onRefresh?: () => void;
}

export function PaymentDetailModal({ open, onClose, orgId, payment, onRefresh }: PaymentDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [manualForm, setManualForm] = useState({ amount: "", method: "cash", notes: "" });

  if (!payment) return null;
  const p: PaymentWithMember = payment;


  function copyParentLink() {
    const token = (p as PaymentWithMember & { parent_pay_token?: string }).parent_pay_token;
    const url = `${window.location.origin}/payments?token=${token ?? p.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Parent payment link copied");
  }

  async function payWithStripe() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: p.id, email: p.member_profiles?.email }),
      });
      const data = await res.json();
      if (data.url) window.open(data.url, "_blank");
      else toast.error(data.error ?? "Failed to start checkout");
    } finally {
      setLoading(false);
    }
  }

  async function logManualPayment() {
    if (!orgId || !manualForm.amount) return;
    setLoading(true);
    try {
      const res = await fetch("/api/payments/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          paymentId: p.id,
          amount: parseFloat(manualForm.amount),
          method: manualForm.method,
          notes: manualForm.notes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Payment logged");
        setManualForm({ amount: "", method: "cash", notes: "" });
        onRefresh?.();
        onClose();
      } else {
        toast.error(data.error ?? "Failed");
      }
    } finally {
      setLoading(false);
    }
  }

  const remaining = Math.max(0, Number(p.amount) - Number(p.paid_amount));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Payment details"
      description={`${p.member_profiles?.full_name ?? "Member"} · ${formatCurrency(remaining)} remaining`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} icon={<X size={14} />}>Close</Button>
          {(p.status === "pending" || p.status === "overdue" || p.status === "partial") && (
            <Button onClick={payWithStripe} loading={loading} icon={<CreditCard size={14} />}>
              Pay with card
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <Card padding="sm">
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="text-lg font-bold">{formatCurrency(Number(p.amount))}</p>
          </Card>
          <Card padding="sm">
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(Number(p.paid_amount))}</p>
          </Card>
          <Card padding="sm">
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className={`text-lg font-bold ${remaining > 0 ? "text-red-500" : "text-green-600"}`}>{formatCurrency(remaining)}</p>
          </Card>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm text-muted-foreground">
            <p>Due: <span className="text-foreground">{p.due_date ? formatDate(p.due_date) : "—"}</span></p>
            <p>Status: <span className="text-foreground">{p.status}</span></p>
          </div>
          <Badge
            label={p.status}
            color={p.status === "paid" ? "green" : p.status === "overdue" ? "red" : p.status === "pending" ? "yellow" : "gray"}
            dot
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={copyParentLink} icon={<Copy size={14} />}>
            Copy parent link
          </Button>
          <Link href="/payments/plan">
            <Button variant="secondary" size="sm" icon={<DollarSign size={14} />}>
              Payment plans
            </Button>
          </Link>
        </div>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">Log cash/check/Venmo</p>
            <p className="text-xs text-muted-foreground">Treasurer use</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <Input
              label="Amount"
              type="number"
              value={manualForm.amount}
              onChange={(e) => setManualForm({ ...manualForm, amount: e.target.value })}
              placeholder={String(remaining)}
            />
            <Select
              label="Method"
              value={manualForm.method}
              onChange={(e) => setManualForm({ ...manualForm, method: e.target.value })}
              options={[{ value: "cash", label: "Cash" }, { value: "check", label: "Check" }, { value: "venmo", label: "Venmo/Zelle" }]}
            />
            <Input
              label="Notes"
              value={manualForm.notes}
              onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
              placeholder="Optional"
            />
          </div>
          <div className="mt-3">
            <Button onClick={logManualPayment} loading={loading} disabled={!manualForm.amount || !orgId}>
              Log payment
            </Button>
          </div>
        </Card>
      </div>
    </Modal>
  );
}