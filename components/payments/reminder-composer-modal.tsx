"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Button, Modal, Select, Textarea } from "@/components/ui";
import type { MemberProfile } from "@/types";
import type { PaymentWithMember } from "@/components/payments/payment-list";

interface ReminderComposerModalProps {
  open: boolean;
  onClose: () => void;
  orgId: string | null;
  payments: PaymentWithMember[];
  members: MemberProfile[];
  onSent?: () => void;
}

export function ReminderComposerModal({
  open, onClose, orgId, payments, members, onSent,
}: ReminderComposerModalProps) {
  const [body, setBody] = useState(
    "You have an outstanding balance on TouseOS. Please sign in to review and pay at your earliest convenience.",
  );
  const [audience, setAudience] = useState("all_unpaid");
  const [memberId, setMemberId] = useState("");
  const [includeHardship, setIncludeHardship] = useState(true);
  const [includePaymentPlans, setIncludePaymentPlans] = useState(true);
  const [loading, setLoading] = useState(false);

  const unpaid = useMemo(
    () => payments.filter((p) => ["pending", "overdue", "partial"].includes(p.status)),
    [payments],
  );

  async function send() {
    if (!orgId || !body.trim()) return;
    setLoading(true);
    const res = await fetch("/api/payments/remind", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        body: body.trim(),
        audience,
        memberId: audience === "individual" ? memberId : undefined,
        includeHardship,
        includePaymentPlans,
      }),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error((data as { error?: string }).error ?? "Failed to send reminders");
      return;
    }
    toast.success((data as { message?: string }).message ?? "Reminders sent");
    onClose();
    onSent?.();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Send payment reminders"
      description={`${unpaid.length} outstanding charge${unpaid.length !== 1 ? "s" : ""} in this org`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={send} disabled={!body.trim() || (audience === "individual" && !memberId)}>
            Send reminders
          </Button>
        </>
      }
    >
      <div className="ds-page-stack" style={{ gap: 16 }}>
        <Textarea
          label="Message body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
        />
        <Select
          label="Recipients"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          options={[
            { value: "all_unpaid", label: "All members with unpaid balances" },
            { value: "overdue_only", label: "Overdue only" },
            { value: "individual", label: "Individual member" },
          ]}
        />
        {audience === "individual" && (
          <Select
            label="Member"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            options={[
              { value: "", label: "Select member…" },
              ...members.map((m) => ({ value: m.id, label: m.full_name })),
            ]}
          />
        )}
        <label className="type-body" style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44 }}>
          <input type="checkbox" checked={includeHardship} onChange={(e) => setIncludeHardship(e.target.checked)} />
          Include members with pending hardship requests
        </label>
        <label className="type-body" style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44 }}>
          <input type="checkbox" checked={includePaymentPlans} onChange={(e) => setIncludePaymentPlans(e.target.checked)} />
          Include members on active payment plans
        </label>
      </div>
    </Modal>
  );
}
