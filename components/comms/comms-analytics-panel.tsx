"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { Card, StatCard } from "@/components/ui";

interface CommsAnalytics {
  memberCount: number;
  totalAnnouncements: number;
  announcementsLast30Days: number;
  pinnedCount: number;
  scheduledPending: number;
  scheduledSent: number;
  emailChannelCount: number;
}

export function CommsAnalyticsPanel({ orgId }: { orgId: string | null }) {
  const [data, setData] = useState<CommsAnalytics | null>(null);

  useEffect(() => {
    if (!orgId) return;
    fetch(`/api/comms/analytics?org_id=${orgId}`).then((r) => r.json()).then(setData);
  }, [orgId]);

  if (!data) return <Card className="h-24 animate-pulse bg-surface-2 border-0">&nbsp;</Card>;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard title="Active members" value={data.memberCount} icon={<Mail size={16} />} />
      <StatCard title="Announcements (30d)" value={data.announcementsLast30Days} icon={<Mail size={16} />} />
      <StatCard title="Scheduled pending" value={data.scheduledPending} icon={<Mail size={16} />} />
      <StatCard title="Emails scheduled" value={data.emailChannelCount} icon={<Mail size={16} />} />
    </div>
  );
}
