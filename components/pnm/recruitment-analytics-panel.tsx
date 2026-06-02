"use client";

import { useEffect, useState } from "react";
import { BarChart2 } from "lucide-react";
import { Card, CardHeader, EmptyState, StatCard } from "@/components/ui";

interface Analytics {
  total: number;
  enriched: number;
  consented: number;
  pipeline: Array<{ status: string; count: number }>;
  campaigns: Array<{ campaign: string; count: number }>;
}

export function RecruitmentAnalyticsPanel({ orgId }: { orgId: string | null }) {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    if (!orgId) return;
    fetch(`/api/pnm/analytics?org_id=${orgId}`)
      .then((r) => r.json())
      .then(setData);
  }, [orgId]);

  if (!data) return <Card className="h-32 animate-pulse bg-surface-2 border-0">&nbsp;</Card>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total PNMs" value={data.total} icon={<BarChart2 size={16} />} />
        <StatCard title="Profiles enriched" value={data.enriched} icon={<BarChart2 size={16} />} />
        <StatCard title="SMS consented" value={data.consented} icon={<BarChart2 size={16} />} />
        <StatCard title="Campaigns" value={data.campaigns.length} icon={<BarChart2 size={16} />} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Pipeline" />
          {data.pipeline.length === 0 ? (
            <EmptyState title="No leads" />
          ) : (
            <div className="space-y-2">
              {data.pipeline.map((row) => (
                <div key={row.status} className="flex justify-between text-sm">
                  <span className="capitalize">{row.status.replace(/_/g, " ")}</span>
                  <span className="font-semibold">{row.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <CardHeader title="By campaign" />
          {data.campaigns.length === 0 ? (
            <EmptyState title="No campaign data" />
          ) : (
            <div className="space-y-2">
              {data.campaigns.map((row) => (
                <div key={row.campaign} className="flex justify-between text-sm">
                  <span>{row.campaign}</span>
                  <span className="font-semibold">{row.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
