"use client";

import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardHeader } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import type { CashFlowForecast } from "@/lib/cash-flow-forecast";

interface CashFlowForecastPanelProps {
  forecast: CashFlowForecast;
}

export function CashFlowForecastPanel({ forecast }: CashFlowForecastPanelProps) {
  const chartData = forecast.months.map((m) => ({
    name: m.label,
    Income: m.projectedIncome,
    Expenses: m.projectedExpense,
    Net: m.net,
    Balance: m.cumulativeNet,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card padding="sm">
          <p className="text-xs text-muted-foreground">Current net</p>
          <p className={`text-lg font-bold ${forecast.currentNet >= 0 ? "text-green-600" : "text-red-500"}`}>
            {formatCurrency(forecast.currentNet)}
          </p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-muted-foreground">Projected income</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(forecast.totalProjectedIncome)}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-muted-foreground">Projected expenses</p>
          <p className="text-lg font-bold text-red-500">{formatCurrency(forecast.totalProjectedExpense)}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-muted-foreground">Ending balance</p>
          <p className={`text-lg font-bold ${forecast.endingBalance >= 0 ? "text-green-600" : "text-red-500"}`}>
            {formatCurrency(forecast.endingBalance)}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader title="Monthly cash flow" description="Spreads remaining budget across the next 6 months based on current actuals" />
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="Income" fill="#059669" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <CardHeader title="Cumulative balance trend" />
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Line type="monotone" dataKey="Balance" stroke="#059669" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
