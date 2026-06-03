"use client";

import Link from "next/link";
import { AlertTriangle, Calendar, CreditCard, Users } from "lucide-react";
import { Card, CardHeader, StatCard } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import type { Payment } from "@/types";

interface TreasurerDashboardProps {
  payments: Payment[];
  planCount: number;
}

export function TreasurerDashboard({ payments, planCount }: TreasurerDashboardProps) {
  const totalExpected = payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalCollected = payments.reduce((s, p) => s + Number(p.paid_amount), 0);
  const overdue = payments.filter((p) => p.status === "overdue");
  const failed = payments.filter((p) => p.status === "failed");
  const upcoming = payments.filter((p) => {
    if (!p.due_date || p.status === "paid") return false;
    const due = new Date(p.due_date);
    const in14 = new Date();
    in14.setDate(in14.getDate() + 14);
    return due <= in14 && due >= new Date();
  });

  const unpaidMemberIds = new Set(
    payments
      .filter((p) => !["paid", "waived", "refunded"].includes(p.status))
      .map((p) => p.member_id)
      .filter(Boolean),
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Expected" value={formatCurrency(totalExpected)} icon={<CreditCard size={16} />} />
        <StatCard title="Collected" value={formatCurrency(totalCollected)} icon={<CreditCard size={16} />} />
        <StatCard title="Overdue" value={String(overdue.length)} icon={<AlertTriangle size={16} />} />
        <StatCard title="Unpaid members" value={String(unpaidMemberIds.size)} icon={<Users size={16} />} />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Card padding="sm">
          <CardHeader title="Needs attention" icon={<AlertTriangle size={14} />} />
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            <li>{failed.length} failed payment{failed.length !== 1 ? "s" : ""}</li>
            <li>{overdue.length} overdue charge{overdue.length !== 1 ? "s" : ""}</li>
            <li>{upcoming.length} due in the next 14 days</li>
            <li>{planCount} active payment plan{planCount !== 1 ? "s" : ""}</li>
          </ul>
        </Card>
        <Card padding="sm">
          <CardHeader title="Quick links" icon={<Calendar size={14} />} />
          <div className="flex flex-col gap-1 text-sm">
            <Link href="/payments/plan" className="text-greek-600 hover:underline">Payment plans →</Link>
            <Link href="/budget" className="text-greek-600 hover:underline">Budget & finance →</Link>
            <Link href="/reimbursements" className="text-greek-600 hover:underline">Reimbursements →</Link>
            <Link href="/reports" className="text-greek-600 hover:underline">Export finance reports →</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
