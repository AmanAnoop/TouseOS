"use client";

import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardHeader } from "@/components/ui";

export interface EngagementTrendPoint {
  label: string;
  photos: number;
  announcements: number;
}

interface EngagementTrendChartProps {
  points: EngagementTrendPoint[];
}

export function EngagementTrendChart({ points }: EngagementTrendChartProps) {
  const data = points.map((p) => ({
    name: p.label,
    Photos: p.photos,
    Announcements: p.announcements,
  }));

  return (
    <Card>
      <CardHeader title="Engagement trend" description="Recent org activity signals" />
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Photos" fill="#059669" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Announcements" fill="#94a3b8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
