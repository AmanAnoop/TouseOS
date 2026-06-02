"use client";

import { useEffect, useState } from "react";
import { Lightbulb, Share2 } from "lucide-react";
import { Card, CardHeader, StatCard } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

interface Summary {
  proposals: {
    total: number;
    outgoing: number;
    incoming: number;
    byStatus: Record<string, number>;
    budgetTotal: number;
  };
  ideas: { total: number; totalUpvotes: number; highRisk: number };
}

export function InterchapterSummaryPanel({ orgId }: { orgId: string | null }) {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    if (!orgId) return;
    fetch(`/api/interchapter/summary?orgId=${orgId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setSummary(data);
      })
      .catch(() => {});
  }, [orgId]);

  if (!summary) return null;

  const pending = summary.proposals.byStatus.pending ?? summary.proposals.byStatus.draft ?? 0;
  const accepted = summary.proposals.byStatus.accepted ?? 0;

  return (
    <Card>
      <CardHeader title="Interchapter overview" description="Proposals and idea board at a glance" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Proposals" value={summary.proposals.total} icon={<Share2 size={18} />} />
        <StatCard title="Pending" value={pending} icon={<Share2 size={18} />} />
        <StatCard title="Accepted" value={accepted} icon={<Share2 size={18} />} />
        <StatCard
          title="Idea upvotes"
          value={summary.ideas.totalUpvotes}
          icon={<Lightbulb size={18} />}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        {summary.proposals.outgoing} sent · {summary.proposals.incoming} received
        {summary.proposals.budgetTotal > 0 &&
          ` · Est. budget ${formatCurrency(summary.proposals.budgetTotal)}`}
        {summary.ideas.highRisk > 0 && ` · ${summary.ideas.highRisk} high-risk ideas`}
      </p>
    </Card>
  );
}
