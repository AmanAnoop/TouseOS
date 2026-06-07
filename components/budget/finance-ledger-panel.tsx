"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Link2 } from "lucide-react";
import { Badge, Card, CardHeader } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import type { FinanceLedger } from "@/lib/budget-sync";

interface FinanceLedgerPanelProps {
  ledger: FinanceLedger | null;
  loading?: boolean;
  /** Greek chapters only — housing is not available for sports/club */
  showHousing?: boolean;
}

export function FinanceLedgerPanel({ ledger, loading, showHousing = true }: FinanceLedgerPanelProps) {
  if (loading) {
    return <Card className="h-40 animate-pulse bg-surface-2 border-0">&nbsp;</Card>;
  }

  if (!ledger) return null;

  return (
    <Card>
      <CardHeader
        title="Live finance ledger"
        description="All collected payments, reimbursements, and philanthropy — synced into your budget lines"
        action={
          <div className="flex gap-2 text-xs">
            <Link href="/payments" className="text-greek-600 hover:underline flex items-center gap-1">
              <Link2 size={12} /> Payments
            </Link>
            <Link href="/reimbursements" className="text-greek-600 hover:underline flex items-center gap-1">
              <Link2 size={12} /> Reimbursements
            </Link>
            {showHousing && (
              <Link href="/housing" className="text-greek-600 hover:underline flex items-center gap-1">
                <Link2 size={12} /> Housing
              </Link>
            )}
            <Link href="/philanthropy" className="text-greek-600 hover:underline flex items-center gap-1">
              <Link2 size={12} /> Philanthropy
            </Link>
          </div>
        }
      />

      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg bg-green-500/10 p-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <ArrowDownLeft size={12} className="text-green-600" /> Money in
          </p>
          <p className="text-lg font-semibold text-foreground">{formatCurrency(ledger.totalCollected)}</p>
          <p className="text-xs text-muted-foreground">{ledger.paymentCount} payment(s) with collections</p>
        </div>
        <div className="rounded-lg bg-red-500/10 p-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <ArrowUpRight size={12} className="text-red-600" /> Reimbursements paid
          </p>
          <p className="text-lg font-semibold text-foreground">{formatCurrency(ledger.totalPaidReimbursements)}</p>
          <p className="text-xs text-muted-foreground">{ledger.reimbursementCount} reimbursement record(s)</p>
        </div>
        <div className="rounded-lg bg-amber-500/10 p-3">
          <p className="text-xs text-muted-foreground">Approved, not paid</p>
          <p className="text-lg font-semibold text-foreground">{formatCurrency(ledger.approvedReimbursementsUnpaid)}</p>
          {ledger.philanthropyCampaigns > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              + {formatCurrency(ledger.philanthropyCampaigns)} philanthropy campaigns
            </p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Income by source</p>
          {ledger.incomeByLine.length === 0 ? (
            <p className="text-sm text-muted-foreground">No collections yet — charges appear after members pay.</p>
          ) : (
            <ul className="space-y-1.5">
              {ledger.incomeByLine.map((row) => (
                <li key={row.line} className="flex justify-between text-sm">
                  <span>{row.line}</span>
                  <span className="font-medium text-green-700 dark:text-green-400">{formatCurrency(row.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Expenses (reimbursements)</p>
          {ledger.expenseByLine.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reimbursement payouts recorded.</p>
          ) : (
            <ul className="space-y-1.5">
              {ledger.expenseByLine.map((row) => (
                <li key={row.line} className="flex justify-between text-sm gap-2">
                  <span className="truncate">{row.line}</span>
                  <span className="font-medium text-red-700 dark:text-red-400 flex-shrink-0">{formatCurrency(row.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge label="Auto-synced to budget" color="green" />
        {ledger.incomeByLine.some((i) => i.line.includes("Housing")) && (
          <Badge label="Includes housing rent" color="blue" />
        )}
      </div>
    </Card>
  );
}
