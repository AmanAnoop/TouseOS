"use client";

import { Avatar, Badge, Card } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Reimbursement } from "@/types";

const STATUS_COLOR: Record<string, string> = {
  submitted: "yellow",
  needs_info: "orange",
  approved: "blue",
  rejected: "red",
  paid: "green",
};

interface ReimbursementListProps {
  items: Reimbursement[];
  loading?: boolean;
  onSelect: (item: Reimbursement) => void;
  showApprovalHints?: boolean;
}

export function ReimbursementList({
  items, loading, onSelect, showApprovalHints,
}: ReimbursementListProps) {
  if (loading) {
    return <Card className="h-48 animate-pulse bg-surface-2 border-0">&nbsp;</Card>;
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {items.map((r) => {
        const needsDualApproval = Number(r.amount) >= 250;
        return (
          <Card
            key={r.id}
            padding="sm"
            className="cursor-pointer hover:border-greek-300 transition-colors"
            onClick={() => onSelect(r)}
          >
            <div className="flex items-start gap-3">
              <Avatar name={r.submitted_by_name ?? "?"} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm">{r.description}</p>
                  <Badge label={r.status.replace("_", " ")} color={(STATUS_COLOR[r.status] ?? "gray") as "green"} />
                  {showApprovalHints && needsDualApproval && r.status === "submitted" && (
                    <Badge label="Needs treasurer + president" color="orange" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {r.submitted_by_name ?? "Member"} · {r.category} · {formatDate(r.created_at)}
                </p>
              </div>
              <p className="text-sm font-bold text-foreground flex-shrink-0">{formatCurrency(Number(r.amount))}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export { STATUS_COLOR };
