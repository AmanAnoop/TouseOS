"use client";

import { useState } from "react";
import { Heart, RefreshCw, TrendingUp } from "lucide-react";
import {
  Alert, Badge, Button, Card, CardHeader, PageHeader, ProgressBar, StatCard,
} from "@/components/ui";
import { healthScoreLabel, type HealthMetricKey } from "@/lib/health-score";

interface MetricMeta {
  score: number;
  hasData: boolean;
  detail?: string;
}

export interface HealthPageInitialData {
  composite: number | null;
  metricsUsed: number;
  metricsTotal: number;
  meta: Partial<Record<HealthMetricKey, MetricMeta>>;
}

interface HealthPageClientProps {
  orgId: string;
  initial: HealthPageInitialData;
}

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

export function HealthPageClient({ orgId, initial }: HealthPageClientProps) {
  const [composite, setComposite] = useState(initial.composite);
  const [metricsUsed, setMetricsUsed] = useState(initial.metricsUsed);
  const [metricsTotal, setMetricsTotal] = useState(initial.metricsTotal);
  const [meta, setMeta] = useState<Partial<Record<HealthMetricKey, MetricMeta>> | null>(initial.meta);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/health?org_id=${encodeURIComponent(orgId)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setLoadError((err as { error?: string }).error ?? "Failed to load health score");
        return;
      }
      const data = await res.json();
      setComposite(data.composite ?? null);
      setMeta(data.meta ?? null);
      setMetricsUsed(data.metricsUsed ?? 0);
      setMetricsTotal(data.metricsTotal ?? 0);
    } finally {
      setRefreshing(false);
    }
  }

  const healthMeta = healthScoreLabel(composite);
  const scoredValues = meta
    ? Object.values(meta).filter((m) => m?.hasData).map((m) => m!.score)
    : [];

  return (
    <div className="ds-page-stack">
      <PageHeader
        title="Health Score"
        action={
          <Button size="sm" variant="secondary" icon={<RefreshCw size={14} />} onClick={refresh} loading={refreshing}>
            Refresh
          </Button>
        }
      />

      {loadError && (
        <Alert type="error" title="Could not load health score" description={loadError} />
      )}

      {composite === null && !loadError && (
        <Alert
          type="info"
          title="Not enough data yet"
          description="Add members, dues charges, events, or a budget to generate a meaningful health score."
        />
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          title="Composite score"
          value={composite ?? "—"}
          delta={healthMeta.label}
          deltaType={healthMeta.color === "green" ? "up" : healthMeta.color === "yellow" ? "neutral" : healthMeta.color === "gray" ? "neutral" : "down"}
          icon={<Heart size={18} />}
        />
        <StatCard
          title="Metrics with data"
          value={`${metricsUsed}/${metricsTotal}`}
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
        <CardHeader title="Score breakdown" icon={<Heart size={16} />} />
        {meta ? (
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
          <p className="text-sm text-muted-foreground">No score data available.</p>
        )}
      </Card>
    </div>
  );
}
