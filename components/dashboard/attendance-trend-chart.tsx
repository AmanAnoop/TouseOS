"use client";

import {
  Line, LineChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardHeader } from "@/components/ui";

export interface AttendanceTrendPoint {
  label: string;
  rate: number;
  checkedIn: number;
  total: number;
}

interface AttendanceTrendChartProps {
  points: AttendanceTrendPoint[];
}

export function AttendanceTrendChart({ points }: AttendanceTrendChartProps) {
  const data = points.map((p) => ({
    name: p.label,
    Attendance: p.rate,
    checkedIn: p.checkedIn,
    total: p.total,
  }));

  return (
    <Card>
      <CardHeader title="Attendance trend" description="Check-in rate across recent events" />
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              formatter={(value: number, name: string, item: { payload?: { checkedIn: number; total: number } }) => {
                if (name === "Attendance") {
                  const c = item.payload?.checkedIn ?? 0;
                  const t = item.payload?.total ?? 0;
                  return [`${value}% (${c}/${t})`, "Attendance"];
                }
                return [value, name];
              }}
            />
            <Line type="monotone" dataKey="Attendance" stroke="#059669" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
