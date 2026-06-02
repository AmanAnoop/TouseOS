"use client";

import Link from "next/link";
import { Card, CardHeader, EmptyState } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { EventPnlRow } from "@/lib/event-pnl";
import { TrendingDown, TrendingUp } from "lucide-react";

interface EventPnlPanelProps {
  rows: EventPnlRow[];
}

export function EventPnlPanel({ rows }: EventPnlPanelProps) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No event-linked finances yet"
        description="Link payment items or reimbursements to events to see profit and loss by event."
      />
    );
  }

  return (
    <Card>
      <CardHeader
        title="Event profit & loss"
        description="Income from event-linked payments minus reimbursements"
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Event</th>
              <th className="py-2 pr-3 font-medium">Date</th>
              <th className="py-2 pr-3 font-medium text-right">Income</th>
              <th className="py-2 pr-3 font-medium text-right">Expenses</th>
              <th className="py-2 font-medium text-right">Net</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.eventId} className="border-b border-border/60 last:border-0">
                <td className="py-2.5 pr-3">
                  <Link href={`/events/${r.eventId}`} className="font-medium text-greek-600 hover:underline">
                    {r.title}
                  </Link>
                </td>
                <td className="py-2.5 pr-3 text-muted-foreground">{formatDate(r.startsAt)}</td>
                <td className="py-2.5 pr-3 text-right text-green-600">{formatCurrency(r.income)}</td>
                <td className="py-2.5 pr-3 text-right text-red-500">{formatCurrency(r.expense)}</td>
                <td className={`py-2.5 text-right font-semibold flex items-center justify-end gap-1 ${r.net >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {r.net >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {formatCurrency(r.net)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
