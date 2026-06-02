"use client";

import Link from "next/link";
import { Card, CardHeader, Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import type { MemberProfile, Payment } from "@/types";

export interface MemberBalanceRow {
  member: MemberProfile;
  outstanding: number;
  overdueCount: number;
  nextDue: string | null;
}

export function computeMemberBalances(
  members: MemberProfile[],
  payments: Payment[],
): MemberBalanceRow[] {
  const byMember = new Map<string, MemberBalanceRow>();

  for (const m of members) {
    if (m.membership_status !== "active" && m.membership_status !== "new_member") continue;
    byMember.set(m.id, {
      member: m,
      outstanding: 0,
      overdueCount: 0,
      nextDue: null,
    });
  }

  for (const p of payments) {
    if (!p.member_id) continue;
    const row = byMember.get(p.member_id);
    if (!row) continue;
    const remaining = Math.max(0, Number(p.amount) - Number(p.paid_amount));
    if (remaining <= 0 || p.status === "paid") continue;

    row.outstanding += remaining + (p.status === "overdue" ? Number(p.late_fee ?? 0) : 0);
    if (p.status === "overdue") row.overdueCount += 1;

    if (p.due_date) {
      const due = new Date(p.due_date).toISOString();
      if (!row.nextDue || due < row.nextDue) row.nextDue = due;
    }
  }

  return Array.from(byMember.values())
    .filter((r) => r.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding);
}

interface MemberBalancesPanelProps {
  rows: MemberBalanceRow[];
}

export function MemberBalancesPanel({ rows }: MemberBalancesPanelProps) {
  if (rows.length === 0) return null;

  const total = rows.reduce((s, r) => s + r.outstanding, 0);

  return (
    <Card>
      <CardHeader
        title="Member balances"
        description={`${rows.length} member${rows.length > 1 ? "s" : ""} with outstanding dues · ${formatCurrency(total)} total`}
      />
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {rows.slice(0, 15).map((row) => (
          <Link
            key={row.member.id}
            href={`/roster/${row.member.id}`}
            className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-surface-1 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{row.member.full_name}</p>
              {row.nextDue && (
                <p className="text-xs text-muted-foreground">
                  Next due {new Date(row.nextDue).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {row.overdueCount > 0 && (
                <Badge label={`${row.overdueCount} overdue`} color="red" />
              )}
              <span className="text-sm font-bold text-red-500">{formatCurrency(row.outstanding)}</span>
            </div>
          </Link>
        ))}
      </div>
      {rows.length > 15 && (
        <p className="text-xs text-muted-foreground mt-2">Showing top 15 by balance</p>
      )}
    </Card>
  );
}
