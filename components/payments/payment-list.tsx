"use client";

import { Avatar, Badge, Button, Card } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Payment, MemberProfile } from "@/types";

export type PaymentWithMember = Payment & {
  member_profiles: MemberProfile | null;
  payment_items?: { title?: string; category?: string; event_id?: string | null } | { title?: string; category?: string; event_id?: string | null }[] | null;
};

interface PaymentListProps {
  payments: PaymentWithMember[];
  loading?: boolean;
  stripeCheckoutEnabled?: boolean;
  onCopyParentLink?: (payment: PaymentWithMember) => void;
  onPayStripe?: (payment: PaymentWithMember) => void;
  onSelect?: (payment: PaymentWithMember) => void;
}

export function PaymentList({ payments, loading, stripeCheckoutEnabled = false, onCopyParentLink, onPayStripe, onSelect }: PaymentListProps) {
  if (loading) {
    return <Card className="h-48 animate-pulse bg-surface-2 border-0">&nbsp;</Card>;
  }

  if (payments.length === 0) {
    return null;
  }

  return (
    <Card padding="none">
      <div className="divide-y divide-border">
        {payments.map((p) => {
          const item = Array.isArray(p.payment_items) ? p.payment_items[0] : p.payment_items;
          const chargeTitle = item?.title;
          return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect?.(p)}
            className="w-full text-left flex items-center gap-3 p-4 hover:bg-surface-1 transition-colors flex-wrap"
          >
            <Avatar name={p.member_profiles?.full_name ?? "?"} src={p.member_profiles?.profile_photo_url} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {chargeTitle ? `${chargeTitle} — ${p.member_profiles?.full_name ?? "Member"}` : (p.member_profiles?.full_name ?? "Member")}
              </p>
              <p className="text-xs text-muted-foreground">
                Due {p.due_date ? formatDate(p.due_date) : "—"}
                {item?.category ? ` · ${item.category}` : ""}
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
            {onCopyParentLink && <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onCopyParentLink(p); }}>Parent link</Button>}
            {(p.status === "pending" || p.status === "overdue" || p.status === "partial") && onPayStripe && stripeCheckoutEnabled && (
              <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onPayStripe(p); }}>Pay</Button>
            )}
          </button>
        );
        })}
      </div>
    </Card>
  );
}
