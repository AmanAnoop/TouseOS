"use client";

import { Avatar, Badge, Button, Card } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Payment, MemberProfile } from "@/types";

export type PaymentWithMember = Payment & { member_profiles: MemberProfile | null };

interface PaymentListProps {
  payments: PaymentWithMember[];
  loading?: boolean;
  onCopyParentLink?: (payment: PaymentWithMember) => void;
  onPayStripe?: (payment: PaymentWithMember) => void;
}

export function PaymentList({ payments, loading, onCopyParentLink, onPayStripe }: PaymentListProps) {
  if (loading) {
    return <Card className="h-48 animate-pulse bg-surface-2 border-0">&nbsp;</Card>;
  }

  if (payments.length === 0) {
    return null;
  }

  return (
    <Card padding="none">
      <div className="divide-y divide-border">
        {payments.map((p) => (
          <div key={p.id} className="flex items-center gap-3 p-4 hover:bg-surface-1 transition-colors flex-wrap">
            <Avatar name={p.member_profiles?.full_name ?? "?"} src={p.member_profiles?.profile_photo_url} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{p.member_profiles?.full_name ?? "Member"}</p>
              <p className="text-xs text-muted-foreground">
                Due {p.due_date ? formatDate(p.due_date) : "—"}
                {p.paid_amount > 0 && p.paid_amount < p.amount && ` · ${formatCurrency(p.paid_amount)} paid`}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-semibold text-foreground">{formatCurrency(p.amount)}</p>
              <Badge
                label={p.status}
                color={p.status === "paid" ? "green" : p.status === "overdue" ? "red" : p.status === "pending" ? "yellow" : "gray"}
                dot
              />
            </div>
            {onCopyParentLink && <Button variant="secondary" size="sm" onClick={() => onCopyParentLink(p)}>Parent link</Button>}
            {(p.status === "pending" || p.status === "overdue") && onPayStripe && (
              <Button variant="secondary" size="sm" onClick={() => onPayStripe(p)}>Pay</Button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
