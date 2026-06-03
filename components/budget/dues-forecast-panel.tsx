"use client";

import Link from "next/link";
import {
  Bar, BarChart, CartesianGrid, Legend,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AlertTriangle, CreditCard, TrendingUp } from "lucide-react";
import { Badge, Button, Card, CardHeader, StatCard } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import type { DuesForecast } from "@/lib/dues-forecast";

interface DuesForecastPanelProps {
  forecast: DuesForecast;
  onSyncToBudget?: () => void;
  syncing?: boolean;
}

export function DuesForecastPanel({ forecast, onSyncToBudget, syncing }: DuesForecastPanelProps) {
  const chartData = forecast.months.map((m) => ({
    name: m.label,
    Expected: m.expected,
    Collected: m.collected,
    Outstanding: m.outstanding,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Expected dues"
          value={formatCurrency(forecast.totalExpected)}
          icon={<CreditCard size={18} />}
        />
        <StatCard
          title="Collected"
          value={formatCurrency(forecast.totalCollected)}
          delta={`${forecast.collectionRate}%`}
          deltaType={forecast.collectionRate >= 80 ? "up" : "neutral"}
          icon={<TrendingUp size={18} />}
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(forecast.totalOutstanding)}
          deltaType={forecast.totalOutstanding > 0 ? "down" : "up"}
          icon={<AlertTriangle size={18} />}
        />
        <Card padding="sm">
          <p className="text-xs text-muted-foreground">Status</p>
          <div className="flex gap-2 mt-1 flex-wrap">
            {forecast.overdueCount > 0 && <Badge label={`${forecast.overdueCount} overdue`} color="red" />}
            {forecast.pendingCount > 0 && <Badge label={`${forecast.pendingCount} pending`} color="yellow" />}
            {forecast.overdueCount === 0 && forecast.pendingCount === 0 && (
              <Badge label="All current" color="green" />
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Dues collection by month"
          description="Based on payment due dates from your Payments module"
          action={
            <div className="flex gap-2">
              {onSyncToBudget && (
                <Button size="sm" variant="secondary" onClick={onSyncToBudget} loading={syncing}>
                  Sync all to budget
                </Button>
              )}
              <Link href="/payments">
                <Button size="sm" variant="ghost">View payments →</Button>
              </Link>
            </div>
          }
        />
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="Expected" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Collected" fill="#059669" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Outstanding" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
