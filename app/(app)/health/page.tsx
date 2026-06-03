"use client";

import { useState, useEffect } from "react";
import { Heart, RefreshCw, TrendingUp } from "lucide-react";
import { useOrg } from "@/hooks/use-org";
import {
  Alert, Badge, Button, Card, CardHeader, PageHeader, ProgressBar, StatCard,
} from "@/components/ui";
import { healthScoreLabel, type HealthMetricKey } from "@/lib/health-score";

interface MetricMeta {
  score: number;
  hasData: boolean;
  detail?: string;
}

export default function HealthPage() {
  const { orgId } = useOrg();
  const [loading, setLoading] = useState(true);
  const [composite, setComposite] = useState<number | null>(null);
  const [metricsUsed, setMetricsUsed] = useState(0);
  const [metricsTotal, setMetricsTotal] = useState(0);
  const [meta, setMeta] = useState<Partial<Record<HealthMetricKey, MetricMeta>> | null>(null);

  async function load(oid: string) {
    setLoading(true);
    const res = await fetch(`/api/health?orgId=${oid}`);
    if (res.ok) {
      const data = await res.json();
      setComposite(data.composite ?? null);
      setMeta(data.meta ?? null);
      setMetricsUsed(data.metricsUsed ?? 0);
      setMetricsTotal(data.metricsTotal ?? 0);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (orgId) load(orgId);
  }, [orgId]);

  const healthMeta = healthScoreLabel(composite);

  const labels: Record<HealthMetricKey, string> = {
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

  const scoredValues = meta
    ? Object.values(meta).filter((m) => m?.hasData).map((m) => m!.score)
    : [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Organization Health Score"
        description="Weighted score from live dues, attendance, compliance, budget, and engagement — empty areas are excluded, not counted as 100%"
        action={
          orgId ? (
            <Button size="sm" variant="secondary" icon={<RefreshCw size={14} />} onClick={() => load(orgId)} loading={loading}>
              Refresh
            </Button>
          ) : undefined
        }
      />

      {composite === null && !loading && (
        <Alert
          type="info"
          title="Not enough data yet"
          description="Add members, dues charges, events, or a budget to generate a meaningful health score. Metrics without data show as “No data” below."
        />
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          title="Composite score"
          value={loading ? "—" : composite ?? "—"}
          delta={healthMeta.label}
          deltaType={healthMeta.color === "green" ? "up" : healthMeta.color === "yellow" ? "neutral" : healthMeta.color === "gray" ? "neutral" : "down"}
          icon={<Heart size={18} />}
        />
        <StatCard
          title="Metrics with data"
          value={loading ? "—" : `${metricsUsed}/${metricsTotal}`}
          icon={<TrendingUp size={18} />}
        />
        <StatCard
          title={scoredValues.length ? "Needs work" : "Range"}
          value={scoredValues.length ? Math.min(...scoredValues) : "—"}
          deltaType="down"
          icon={<TrendingUp size={18} />}
        />
      </div>

      <Card>
        <CardHeader title="Score breakdown" description="Only measured areas count toward the composite" icon={<Heart size={16} />} />
        {loading ? (
          <p className="text-sm text-muted-foreground">Computing health score...</p>
        ) : meta ? (
          <div className="space-y-4">
            {(Object.keys(labels) as HealthMetricKey[]).map((key) => {
              const m = meta[key];
              if (!m) return null;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                    <p className="text-sm font-medium">{labels[key]}</p>
                    {m.hasData ? (
                      <Badge label={`${m.score}/100`} color={m.score >= 80 ? "green" : m.score >= 60 ? "yellow" : "red"} />
                    ) : (
                      <Badge label="No data" color="gray" />
                    )}
                  </div>
                  {m.hasData ? (
                    <ProgressBar value={m.score} color={m.score >= 80 ? "green" : m.score >= 60 ? "yellow" : "red"} size="md" />
                  ) : (
                    <p className="text-xs text-muted-foreground">{m.detail ?? "Add chapter activity to measure this"}</p>
                  )}
                  {m.hasData && m.detail && (
                    <p className="text-xs text-muted-foreground mt-1">{m.detail}</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Unable to load health score.</p>
        )}
      </Card>
    </div>
  );
}
