"use client";

import { AlertTriangle, DollarSign } from "lucide-react";
import { StatCard } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

interface PaymentStatsProps {
  totalExpected: number;
  totalCollected: number;
  pendingCount: number;
  overdueCount: number;
}

export function PaymentStats({
  totalExpected, totalCollected, pendingCount, overdueCount,
}: PaymentStatsProps) {
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard title="Total expected" value={formatCurrency(totalExpected)} icon={<DollarSign size={18} />} />
      <StatCard title="Total collected" value={formatCurrency(totalCollected)} deltaType="up" delta={`${collectionRate}%`} icon={<DollarSign size={18} />} />
      <StatCard title="Pending" value={pendingCount} icon={<AlertTriangle size={18} />} />
      <StatCard title="Overdue" value={overdueCount} deltaType={overdueCount > 0 ? "down" : "neutral"} icon={<AlertTriangle size={18} />} />
    </div>
  );
}
