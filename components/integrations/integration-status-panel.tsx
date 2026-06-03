"use client";

import { useEffect, useState } from "react";
import { Badge, Card } from "@/components/ui";

type IntegrationRow = {
  id: string;
  label: string;
  configured: boolean;
  live: boolean;
  hint?: string;
};

export function IntegrationStatusPanel() {
  const [rows, setRows] = useState<IntegrationRow[]>([]);
  const [stripeReachable, setStripeReachable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/integrations/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.integrations) setRows(data.integrations);
        if (data?.stripe?.reachable !== undefined) setStripeReachable(data.stripe.reachable);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Checking integrations…</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <Card key={row.id} padding="sm">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-sm">{row.label}</p>
            <Badge
              label={row.live ? "Live" : row.configured ? "Partial" : "Not configured"}
              color={row.live ? "green" : row.configured ? "yellow" : "gray"}
              dot
            />
          </div>
          {row.hint && <p className="text-xs text-muted-foreground mt-1">{row.hint}</p>}
        </Card>
      ))}
      {stripeReachable === true && (
        <p className="text-xs text-green-700 dark:text-green-400">
          Stripe API connection verified for this deployment.
        </p>
      )}
    </div>
  );
}
