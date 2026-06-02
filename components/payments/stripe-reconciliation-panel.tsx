"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button, Card, CardHeader } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import type { ReconciliationSummary } from "@/lib/stripe-reconciliation";

function centsToDollars(cents: number) {
  return formatCurrency(cents / 100);
}

export function StripeReconciliationPanel({ orgId }: { orgId: string }) {
  const [data, setData] = useState<ReconciliationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/payments/stripe-reconciliation?org_id=${encodeURIComponent(orgId)}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to load reconciliation");
        setData(null);
      } else {
        setData(json as ReconciliationSummary);
      }
    } catch {
      setError("Network error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <Card>
        <CardHeader title="Stripe reconciliation" description="Comparing TouseOS records with Stripe payment intents…" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader title="Stripe reconciliation" description={error} />
        <Button variant="secondary" size="sm" className="mt-3 officer-touch" onClick={load}>
          Retry
        </Button>
      </Card>
    );
  }

  if (!data) return null;

  const issues = data.mismatch + data.stripeErrors + data.missingIntent;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <CardHeader
          title="Stripe reconciliation"
          description={
            data.connectedAccountId
              ? `Destination account ${data.connectedAccountId.slice(0, 12)}…`
              : "Platform account (Connect not active)"
          }
        />
        <Button
          variant="secondary"
          size="sm"
          className="officer-touch"
          icon={<RefreshCw size={14} />}
          onClick={load}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        <div className="rounded-lg bg-surface-1 p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Matched</p>
          <p className="text-xl font-semibold text-emerald-600">{data.matched}</p>
        </div>
        <div className="rounded-lg bg-surface-1 p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Issues</p>
          <p className={`text-xl font-semibold ${issues > 0 ? "text-amber-600" : "text-foreground"}`}>
            {issues}
          </p>
        </div>
        <div className="rounded-lg bg-surface-1 p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Recorded</p>
          <p className="text-lg font-semibold">{centsToDollars(data.totalRecordedCents)}</p>
        </div>
        <div className="rounded-lg bg-surface-1 p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Stripe received</p>
          <p className="text-lg font-semibold">{centsToDollars(data.totalStripeCents)}</p>
        </div>
      </div>

      {data.totalApplicationFeeCents > 0 && (
        <p className="text-sm text-muted-foreground mt-3">
          Platform application fees (sample): {centsToDollars(data.totalApplicationFeeCents)}
        </p>
      )}

      {data.rows.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2 pr-3 font-medium">Member</th>
                <th className="py-2 pr-3 font-medium">Recorded</th>
                <th className="py-2 pr-3 font-medium">Stripe</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.slice(0, 20).map((row) => (
                <tr key={row.paymentId} className="border-b border-border/60">
                  <td className="py-2 pr-3">{row.memberName ?? "—"}</td>
                  <td className="py-2 pr-3">{centsToDollars(row.recordedCents)}</td>
                  <td className="py-2 pr-3">
                    {row.stripeCents != null ? centsToDollars(row.stripeCents) : "—"}
                  </td>
                  <td className="py-2">
                    <span
                      className={
                        row.status === "matched"
                          ? "text-emerald-600"
                          : row.status === "mismatch"
                            ? "text-amber-600"
                            : "text-muted-foreground"
                      }
                    >
                      {row.status.replace(/_/g, " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.rows.length > 20 && (
            <p className="text-xs text-muted-foreground mt-2">
              Showing 20 of {data.rows.length} reconciled payments
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
