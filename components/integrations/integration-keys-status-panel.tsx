"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound, ExternalLink } from "lucide-react";
import { Alert, Badge, Card, CardHeader, ProgressBar } from "@/components/ui";
import { can, type RoleName } from "@/lib/permissions";

interface KeyStatus {
  id: string;
  label: string;
  configured: boolean;
  live: boolean;
  hint?: string;
}

interface IntegrationKeysStatusPanelProps {
  role: RoleName;
}

export function IntegrationKeysStatusPanel({ role }: IntegrationKeysStatusPanelProps) {
  const [rows, setRows] = useState<KeyStatus[]>([]);
  const [stripeReachable, setStripeReachable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const isAdmin = can(role, "manage_org_settings");

  useEffect(() => {
    fetch("/api/integrations/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.integrations) setRows(data.integrations);
        if (data?.stripe) setStripeReachable(data.stripe.reachable ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  const liveCount = rows.filter((r) => r.live).length;
  const pct = rows.length ? Math.round((liveCount / rows.length) * 100) : 0;

  if (loading) {
    return <p className="text-sm text-muted-foreground">Checking integration keys…</p>;
  }

  return (
    <Card>
      <CardHeader
        title="Platform integration keys"
        description="Server-side keys that power payments, SMS, maps, and email"
        icon={<KeyRound size={16} />}
      />

      <div className="mb-4">
        <ProgressBar value={pct} label={`${liveCount} of ${rows.length} services live`} color={pct >= 80 ? "green" : pct >= 50 ? "yellow" : "red"} />
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center justify-between gap-3 p-2 rounded-lg border border-border">
            <div>
              <p className="text-sm font-medium capitalize">{row.label ?? row.id}</p>
              {row.hint && <p className="text-xs text-muted-foreground">{row.hint}</p>}
            </div>
            <Badge
              label={row.live ? "Live" : row.configured ? "Partial" : "Not configured"}
              color={row.live ? "green" : row.configured ? "yellow" : "gray"}
            />
          </div>
        ))}
      </div>

      {stripeReachable === false && (
        <Alert type="warning" className="mt-4" title="Stripe unreachable" description="Payments may fail until platform Stripe keys are fixed." />
      )}

      {isAdmin ? (
        <p className="text-xs text-muted-foreground mt-4">
          Platform admins can edit keys in{" "}
          <Link href="/platform-admin/keys" className="inline-flex items-center gap-1 underline text-greek-600">
            Platform admin → Keys <ExternalLink size={12} />
          </Link>
        </p>
      ) : (
        <Alert type="info" className="mt-4" title="Need a key added?" description="Ask your platform administrator to configure missing services." />
      )}
    </Card>
  );
}
