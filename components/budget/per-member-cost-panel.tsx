"use client";

import Link from "next/link";
import { Card, CardHeader, EmptyState } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import type { MemberCostRow } from "@/lib/per-member-cost";

interface PerMemberCostPanelProps {
  rows: MemberCostRow[];
  totalChapterSpend: number;
}

export function PerMemberCostPanel({ rows, totalChapterSpend }: PerMemberCostPanelProps) {
  if (rows.length === 0) {
    return <EmptyState title="No active members" description="Add members to see per-member cost estimates." />;
  }

  return (
    <Card>
      <CardHeader
        title="Per-member cost estimate"
        description={`Shared chapter spend (~${formatCurrency(totalChapterSpend)}) divided across active members, plus individual dues and reimbursements`}
      />
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Member</th>
              <th className="py-2 pr-3 font-medium text-right">Dues paid</th>
              <th className="py-2 pr-3 font-medium text-right">Owed</th>
              <th className="py-2 pr-3 font-medium text-right">Reimb.</th>
              <th className="py-2 font-medium text-right">Est. share</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.memberId} className="border-b border-border/60 last:border-0">
                <td className="py-2.5 pr-3">
                  <Link href={`/roster/${r.memberId}`} className="font-medium hover:underline">
                    {r.fullName}
                  </Link>
                </td>
                <td className="py-2.5 pr-3 text-right text-green-600">{formatCurrency(r.duesPaid)}</td>
                <td className={`py-2.5 pr-3 text-right ${r.duesOwed > 0 ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                  {formatCurrency(r.duesOwed)}
                </td>
                <td className="py-2.5 pr-3 text-right">{formatCurrency(r.reimbSubmitted)}</td>
                <td className="py-2.5 text-right text-muted-foreground">{formatCurrency(r.estimatedChapterCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
