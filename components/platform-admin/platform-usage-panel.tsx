"use client";

import { useEffect, useState } from "react";
import { BarChart3, MessageSquare, Shield } from "lucide-react";
import { Card, CardHeader, StatCard } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

interface UsageData {
  periodDays: number;
  smsMessagesLast30Days: number;
  paymentsVolumeAllTime: number;
  photoCount: number;
  greekmatchReports: number;
  organizationsByType: Record<string, number>;
  suspendedOrganizations: Array<{ id: string; name: string }>;
}

export function PlatformUsagePanel() {
  const [usage, setUsage] = useState<UsageData | null>(null);

  useEffect(() => {
    fetch("/api/platform-admin/usage")
      .then((r) => r.json())
      .then(setUsage);
  }, []);

  if (!usage) {
    return <Card className="h-32 animate-pulse bg-surface-2 border-0">&nbsp;</Card>;
  }

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title={`SMS (last ${usage.periodDays}d)`} value={usage.smsMessagesLast30Days} icon={<MessageSquare size={18} />} />
        <StatCard title="Paid volume" value={formatCurrency(usage.paymentsVolumeAllTime)} icon={<BarChart3 size={18} />} />
        <StatCard title="Photos stored" value={usage.photoCount} icon={<BarChart3 size={18} />} />
        <StatCard title="GreekMatch reports" value={usage.greekmatchReports} icon={<Shield size={18} />} />
      </div>

      <Card>
        <CardHeader title="Organizations by type" />
        <div className="flex flex-wrap gap-2">
          {Object.entries(usage.organizationsByType).map(([type, count]) => (
            <span key={type} className="text-sm px-3 py-1.5 rounded-lg bg-surface-1 border border-border">
              {type.replace(/_/g, " ")}: <strong>{count}</strong>
            </span>
          ))}
        </div>
      </Card>

      {usage.suspendedOrganizations.length > 0 && (
        <Card padding="sm" className="border-amber-200 bg-amber-50/50">
          <p className="text-sm font-semibold text-amber-900">Suspended organizations</p>
          <ul className="mt-2 text-sm text-amber-800 space-y-1">
            {usage.suspendedOrganizations.map((o) => (
              <li key={o.id}>{o.name}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
