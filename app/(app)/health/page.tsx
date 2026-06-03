"use client";

import { useState, useEffect } from "react";
import { Heart, RefreshCw, TrendingUp } from "lucide-react";
import { useOrg } from "@/hooks/use-org";
import {
  Badge, Button, Card, CardHeader, PageHeader, ProgressBar, StatCard,
} from "@/components/ui";
import { healthScoreLabel } from "@/lib/health-score";

interface Breakdown {
  duesCollection: number;
  recruitmentConversion: number;
  eventAttendance: number;
  memberRetention: number;
  officerTaskCompletion: number;
  budgetHealth: number;
  complianceForms: number;
  reimbursementHealth: number;
  waiverCompletion?: number;
}

export default function HealthPage() {
  const { orgId } = useOrg();
  const [loading, setLoading] = useState(true);
  const [composite, setComposite] = useState(0);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);

  async function load(oid: string) {
    setLoading(true);
    const res = await fetch(`/api/health?orgId=${oid}`);
    if (res.ok) {
      const data = await res.json();
      setComposite(data.composite);
      setBreakdown(data.breakdown);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (orgId) load(orgId);
  }, [orgId]);

  const meta = healthScoreLabel(composite);

  const labels: Record<keyof Breakdown, string> = {
    duesCollection: "Dues collection",
    recruitmentConversion: "Recruitment / tryout conversion",
    eventAttendance: "Event attendance",
    memberRetention: "Member retention",
    officerTaskCompletion: "Officer task completion",
    budgetHealth: "Budget health",
    complianceForms: "Forms compliance",
    reimbursementHealth: "Reimbursement processing",
    waiverCompletion: "Waiver completion (sports)",
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Organization Health Score"
        description="Composite score from dues, attendance, compliance, budget, and engagement metrics"
        action={
          orgId ? (
            <Button size="sm" variant="secondary" icon={<RefreshCw size={14} />} onClick={() => load(orgId)} loading={loading}>
              Refresh
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard title="Composite score" value={loading ? "—" : composite} delta={meta.label} deltaType={meta.color === "green" ? "up" : meta.color === "yellow" ? "neutral" : "down"} icon={<Heart size={18} />} />
        <StatCard title="Strongest area" value={breakdown ? Math.max(...Object.values(breakdown).filter((v): v is number => typeof v === "number")) : "—"} icon={<TrendingUp size={18} />} />
        <StatCard title="Needs work" value={breakdown ? Math.min(...Object.values(breakdown).filter((v): v is number => typeof v === "number")) : "—"} deltaType="down" icon={<TrendingUp size={18} />} />
      </div>

      <Card>
        <CardHeader title="Score breakdown" description="Each component is scored 0–100 based on live org data" icon={<Heart size={16} />} />
        {loading ? (
          <p className="text-sm text-muted-foreground">Computing health score...</p>
        ) : breakdown ? (
          <div className="space-y-4">
            {Object.entries(breakdown).map(([key, val]) => (
              val !== undefined ? (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">{labels[key as keyof Breakdown] ?? key}</p>
                    <Badge label={`${val}/100`} color={val >= 80 ? "green" : val >= 60 ? "yellow" : "red"} />
                  </div>
                  <ProgressBar value={val} color={val >= 80 ? "green" : val >= 60 ? "yellow" : "red"} size="md" />
                </div>
              ) : null
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Unable to load health score.</p>
        )}
      </Card>
    </div>
  );
}
