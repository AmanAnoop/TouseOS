"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import { Alert, Badge, Button, Card } from "@/components/ui";

export function StripeConnectPanel({
  orgId,
  initialAccountId,
}: {
  orgId: string;
  initialAccountId: string | null;
}) {
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState<{
    connected: boolean;
    chargesEnabled?: boolean;
    detailsSubmitted?: boolean;
    requirementsDue?: string[];
  }>({ connected: Boolean(initialAccountId) });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/stripe/connect?org_id=${orgId}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok && res.status !== 503) {
      return;
    }
    if (res.ok) {
      setStatus({
        connected: data.connected,
        chargesEnabled: data.chargesEnabled,
        detailsSubmitted: data.detailsSubmitted,
        requirementsDue: data.requirementsDue,
      });
    }
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  async function startOnboarding() {
    setConnecting(true);
    const res = await fetch("/api/stripe/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId }),
    });
    setConnecting(false);
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not start Stripe onboarding");
      return;
    }
    if (data.url) {
      window.location.href = data.url;
    }
  }

  if (loading) {
    return <Card className="h-24 animate-pulse bg-surface-2 border-0">&nbsp;</Card>;
  }

  return (
    <Card padding="sm" className="border-greek-200 dark:border-greek-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-sm flex items-center gap-2">
            <CreditCard size={16} className="text-greek-600" />
            Stripe Connect
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Connect your chapter Stripe account to accept dues and donations directly.
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge
              label={status.connected ? "Account linked" : "Not connected"}
              color={status.connected ? "blue" : "gray"}
            />
            {status.chargesEnabled && <Badge label="Charges enabled" color="green" />}
            {status.detailsSubmitted && <Badge label="Onboarding complete" color="green" />}
            {status.connected && !status.chargesEnabled && (
              <Badge label="Finish onboarding" color="yellow" />
            )}
          </div>
          {(status.requirementsDue?.length ?? 0) > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
              Stripe needs: {status.requirementsDue?.slice(0, 3).join(", ")}
            </p>
          )}
        </div>
        <Button
          size="sm"
          className="officer-touch flex-shrink-0"
          icon={<ExternalLink size={14} />}
          loading={connecting}
          onClick={startOnboarding}
        >
          {status.connected ? "Continue setup" : "Connect Stripe"}
        </Button>
      </div>
      {!status.connected && (
        <Alert
          type="info"
          title="Platform payments"
          description="Online dues and donations are blocked until Connect is complete with charges enabled."
          className="mt-3"
        />
      )}
      {status.chargesEnabled && (
        <Alert
          type="success"
          title="Destination charges active"
          description="Member dues, parent pay links, and philanthropy donations transfer to this account (0.25% platform fee)."
          className="mt-3"
        />
      )}
    </Card>
  );
}
