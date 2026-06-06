"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Button, Modal, Textarea } from "@/components/ui";
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

type AudiencePreset = "all_members" | "unpaid_only" | "overdue_only" | "specific";

const DEFAULT_MESSAGE =
  "Hi [First Name], this is a reminder that your dues of $[Amount] are due on [Date]. Please log in to TouseOS to make a payment.";

export function ReminderComposerModal({
  open, onClose, orgId, payments, members, onSent,
}: ReminderComposerModalProps) {
  const [body, setBody] = useState(DEFAULT_MESSAGE);
  const [audience, setAudience] = useState<AudiencePreset>("unpaid_only");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [sendVia, setSendVia] = useState<"in_app" | "email" | "both">("both");
  const [loading, setLoading] = useState(false);

  const unpaid = useMemo(
    () => payments.filter((p) => ["pending", "overdue", "partial"].includes(p.status)),
    [payments],
  );

  const overdue = useMemo(
    () => payments.filter((p) => p.status === "overdue"),
    [payments],
  );

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return members.slice(0, 8);
    return members.filter((m) => m.full_name.toLowerCase().includes(q)).slice(0, 8);
  }, [members, memberSearch]);

  function toggleMember(id: string) {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    setAudience("specific");
  }

  function removeChip(id: string) {
    setSelectedMemberIds((prev) => prev.filter((x) => x !== id));
  }

  async function send() {
    if (!orgId || !body.trim()) return;
    setLoading(true);

    const audienceMap: Record<AudiencePreset, string> = {
      all_members: "all_unpaid",
      unpaid_only: "all_unpaid",
      overdue_only: "overdue_only",
      specific: "individual",
    };

    const res = await fetch("/api/payments/remind", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        body: body.trim(),
        audience: audienceMap[audience],
        memberId: audience === "specific" && selectedMemberIds.length === 1
          ? selectedMemberIds[0]
          : undefined,
        memberIds: audience === "specific" && selectedMemberIds.length > 1
          ? selectedMemberIds
          : undefined,
        sendVia,
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
      title="Send reminders"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            loading={loading}
            onClick={send}
            disabled={!body.trim() || (audience === "specific" && selectedMemberIds.length === 0)}
          >
            Send reminders
          </Button>
        </>
      }
    >
      <div className="ds-page-stack" style={{ gap: 16 }}>
        <div className="ds-field">
          <label className="type-label" htmlFor="reminder-to">To</label>
          <select
            id="reminder-to"
            className="ds-input"
            value={audience}
            onChange={(e) => setAudience(e.target.value as AudiencePreset)}
          >
            <option value="all_members">All members</option>
            <option value="unpaid_only">Unpaid only</option>
            <option value="overdue_only">Overdue only</option>
            <option value="specific">Pick individual members</option>
          </select>
          {audience === "specific" && (
            <>
              <input
                className="ds-input"
                type="search"
                placeholder="Search members by name…"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                style={{ marginTop: 8 }}
              />
              {filteredMembers.length > 0 && (
                <ul className="ds-autocomplete-list" style={{ position: "relative", marginTop: 4 }}>
                  {filteredMembers.map((m) => (
                    <li key={m.id} role="option">
                      <button
                        type="button"
                        className="ds-autocomplete-item"
                        onClick={() => toggleMember(m.id)}
                      >
                        <span style={{ fontWeight: selectedMemberIds.includes(m.id) ? 600 : 400 }}>{m.full_name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {selectedMemberIds.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {selectedMemberIds.map((id) => {
                const m = members.find((x) => x.id === id);
                return (
                  <button
                    key={id}
                    type="button"
                    className="ds-chip"
                    onClick={() => removeChip(id)}
                    aria-label={`Remove ${m?.full_name ?? "member"}`}
                  >
                    {m?.full_name ?? "Member"} ×
                  </button>
                );
              })}
            </div>
          )}
          <p className="type-small" style={{ color: "var(--color-text-tertiary)", marginTop: 4 }}>
            {audience === "overdue_only"
              ? `${overdue.length} overdue charge${overdue.length !== 1 ? "s" : ""}`
              : `${unpaid.length} outstanding charge${unpaid.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        <Textarea
          label="Message"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          style={{ minHeight: 120 }}
        />

        <div className="ds-field">
          <span className="type-label">Send via</span>
          <div style={{ display: "flex", gap: 8 }}>
            {([
              ["in_app", "In-app notification"],
              ["email", "Email"],
              ["both", "Both"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`ds-segment ${sendVia === value ? "ds-segment-active" : ""}`}
                onClick={() => setSendVia(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
