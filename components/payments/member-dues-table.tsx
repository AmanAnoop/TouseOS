"use client";

import Link from "next/link";
import { Badge, Button } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import type { MemberProfile } from "@/types";
import type { PaymentWithMember } from "@/components/payments/payment-list";

export interface MemberDuesRow {
  member: MemberProfile;
  amountDue: number;
  amountPaid: number;
  balance: number;
  status: "paid" | "pending" | "overdue" | "partial";
  lastActivity: string | null;
}

export function buildMemberDuesRows(
  members: MemberProfile[],
  payments: PaymentWithMember[],
): MemberDuesRow[] {
  const rows = new Map<string, MemberDuesRow>();

  for (const m of members) {
    if (m.membership_status !== "active" && m.membership_status !== "new_member") continue;
    rows.set(m.id, {
      member: m,
      amountDue: 0,
      amountPaid: 0,
      balance: 0,
      status: "paid",
      lastActivity: null,
    });
  }

  const statusRank: Record<MemberDuesRow["status"], number> = {
    overdue: 4,
    partial: 3,
    pending: 2,
    paid: 1,
  };

  for (const p of payments) {
    if (!p.member_id) continue;
    const row = rows.get(p.member_id);
    if (!row) continue;

    const amount = Number(p.amount);
    const paid = Number(p.paid_amount);
    row.amountDue += amount;
    row.amountPaid += paid;
    row.balance += Math.max(0, amount - paid);

    const pStatus = p.status as MemberDuesRow["status"];
    if (statusRank[pStatus] > statusRank[row.status]) row.status = pStatus;

    const activity = p.paid_at ?? p.updated_at ?? p.created_at ?? null;
    if (activity && (!row.lastActivity || activity > row.lastActivity)) {
      row.lastActivity = activity;
    }
  }

  return Array.from(rows.values())
    .filter((r) => r.amountDue > 0)
    .sort((a, b) => b.balance - a.balance);
}

interface MemberDuesTableProps {
  rows: MemberDuesRow[];
  onSelectMember?: (memberId: string) => void;
}

function statusColor(status: MemberDuesRow["status"]) {
  if (status === "paid") return "green";
  if (status === "overdue") return "red";
  if (status === "partial") return "yellow";
  return "gray";
}

export function MemberDuesTable({ rows, onSelectMember }: MemberDuesTableProps) {
  if (rows.length === 0) {
    return (
      <p className="type-small" style={{ color: "var(--color-text-secondary)", padding: "16px 0" }}>
        No member dues on record yet.
      </p>
    );
  }

  return (
    <div className="ds-table-wrap">
      <table className="ds-table">
        <thead>
          <tr>
            <th>Member name</th>
            <th className="ds-td-num">Amount due</th>
            <th className="ds-td-num">Amount paid</th>
            <th className="ds-td-num">Balance</th>
            <th>Status</th>
            <th>Last activity</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.member.id}>
              <td>
                <Link href={`/roster/${row.member.id}`} style={{ fontWeight: 500, color: "inherit", textDecoration: "none" }}>
                  {row.member.full_name}
                </Link>
              </td>
              <td className="ds-td-num" style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{formatCurrency(row.amountDue)}</td>
              <td className="ds-td-num" style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{formatCurrency(row.amountPaid)}</td>
              <td className="ds-td-num" style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{formatCurrency(row.balance)}</td>
              <td>
                <Badge label={row.status} color={statusColor(row.status)} />
              </td>
              <td className="type-small" style={{ color: "var(--color-text-secondary)" }}>
                {row.lastActivity
                  ? new Date(row.lastActivity).toLocaleDateString()
                  : "—"}
              </td>
              <td>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onSelectMember?.(row.member.id)}
                >
                  View
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
