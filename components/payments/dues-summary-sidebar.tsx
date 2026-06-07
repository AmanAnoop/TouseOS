"use client";

import { Card, CardHeader } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import type { PaymentWithMember } from "@/components/payments/payment-list";

interface DuesSummarySidebarProps {
  payments: PaymentWithMember[];
}

export function DuesSummarySidebar({ payments }: DuesSummarySidebarProps) {
  const totalOutstanding = payments.reduce(
    (s, p) => s + Math.max(0, Number(p.amount) - Number(p.paid_amount)),
    0,
  );
  const totalCollected = payments.reduce((s, p) => s + Number(p.paid_amount), 0);
  const overdueCount = payments.filter((p) => p.status === "overdue").length;
  const pendingCount = payments.filter((p) => p.status === "pending").length;
  const paidCount = payments.filter((p) => p.status === "paid").length;
  const partialCount = payments.filter((p) => p.status === "partial").length;
  const total = overdueCount + pendingCount + paidCount + partialCount || 1;

  const segments = [
    { label: "Overdue", count: overdueCount, color: "var(--color-error)" },
    { label: "Pending", count: pendingCount, color: "var(--color-warning)" },
    { label: "Partial", count: partialCount, color: "var(--color-info)" },
    { label: "Paid", count: paidCount, color: "var(--color-success)" },
  ];

  return (
    <Card>
      <CardHeader title="Summary" />
      <div className="ds-page-stack" style={{ gap: 16 }}>
        <div>
          <p className="type-label" style={{ marginBottom: 4 }}>Total outstanding</p>
          <p className="type-display" style={{ fontSize: 28, margin: 0 }}>{formatCurrency(totalOutstanding)}</p>
        </div>
        <div>
          <p className="type-label" style={{ marginBottom: 4 }}>Total collected</p>
          <p className="type-display" style={{ fontSize: 28, margin: 0 }}>{formatCurrency(totalCollected)}</p>
        </div>
        <div>
          <p className="type-label" style={{ marginBottom: 4 }}>Overdue count</p>
          <p className="type-display" style={{ fontSize: 28, margin: 0 }}>{overdueCount}</p>
        </div>
        <div>
          <p className="type-label" style={{ marginBottom: 8 }}>By status</p>
          <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", gap: 2 }}>
            {segments.map((seg) => (
              seg.count > 0 && (
                <div
                  key={seg.label}
                  title={`${seg.label}: ${seg.count}`}
                  style={{
                    flex: seg.count / total,
                    background: seg.color,
                    minWidth: seg.count > 0 ? 4 : 0,
                  }}
                />
              )
            ))}
          </div>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {segments.map((seg) => (
              <div key={seg.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="type-small" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: seg.color, display: "inline-block" }} />
                  {seg.label}
                </span>
                <span className="type-small" style={{ fontFamily: "var(--font-mono)" }}>{seg.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
