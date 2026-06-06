"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Badge, Card } from "@/components/ui";
import { StripeIntegrationCard } from "@/components/integrations/stripe-integration-card";
import { TwilioIntegrationCard } from "@/components/integrations/twilio-integration-card";
import { BankConnectCard } from "@/components/finance/bank-connect-card";
import { IntegrationKeysStatusPanel } from "@/components/integrations/integration-keys-status-panel";
import { isFinanceOfficerRole } from "@/lib/finance-access";
import { can, type RoleName } from "@/lib/permissions";

interface IntegrationsHubProps {
  orgId: string | null;
  stripeAccountId: string | null;
  role: RoleName;
}

export function IntegrationsHub({ orgId, stripeAccountId, role }: IntegrationsHubProps) {
  const [loading, setLoading] = useState(true);
  const [stripe, setStripe] = useState<{
    platformConfigured: boolean;
    reachable: boolean | null;
  }>({ platformConfigured: false, reachable: null });
  const [rows, setRows] = useState<Array<{
    id: string;
    configured: boolean;
    live: boolean;
    hint?: string;
  }>>([]);

  useEffect(() => {
    fetch("/api/integrations/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.integrations) setRows(data.integrations);
        if (data?.stripe) {
          setStripe({
            platformConfigured: Boolean(data.stripe.platformConfigured),
            reachable: data.stripe.reachable ?? null,
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const stripeRow = rows.find((r) => r.id === "stripe");
  const twilioRow = rows.find((r) => r.id === "twilio");
  const isAdmin = can(role, "manage_org_settings");
  const isFinanceOfficer = isFinanceOfficerRole(role);
  const canTestSms = can(role, "send_mass_texts");

  if (loading) {
    return <p className="text-sm text-muted-foreground">Checking integrations…</p>;
  }

  return (
    <div className="space-y-6">
      <Alert
        type="info"
        title="How integrations work"
        description="Connect your chapter bank and Stripe from this page. Server keys (Plaid, Stripe, Twilio) are configured by your platform admin."
      />

      {orgId && isFinanceOfficer ? (
        <BankConnectCard orgId={orgId} variant="compact" />
      ) : orgId ? (
        <Card padding="sm">
          <p className="text-sm text-muted-foreground">
            Bank account linking is available to the treasurer or president in Settings → Integrations.
          </p>
        </Card>
      ) : null}

      {orgId && isAdmin ? (
        <StripeIntegrationCard
          orgId={orgId}
          stripeAccountId={stripeAccountId}
          platformConfigured={stripe.platformConfigured}
          platformReachable={stripe.reachable}
          webhookConfigured={Boolean(stripeRow?.live)}
        />
      ) : (
        <Card padding="sm">
          <p className="text-sm text-muted-foreground">
            Stripe Connect is available to org admins in Settings → Integrations.
          </p>
          {stripeRow && (
            <Badge
              className="mt-2"
              label={stripeRow.live ? "Stripe live" : "Stripe not ready"}
              color={stripeRow.live ? "green" : "yellow"}
            />
          )}
        </Card>
      )}

      {orgId ? (
        <TwilioIntegrationCard
          orgId={orgId}
          configured={Boolean(twilioRow?.configured)}
          live={Boolean(twilioRow?.live)}
          canTest={canTestSms}
        />
      ) : null}

      <IntegrationKeysStatusPanel role={role} />

      <p className="text-xs text-muted-foreground">
        <Link href="/settings?tab=integrations" className="underline">
          Settings → Integrations
        </Link>{" "}
        is the home for payment and messaging setup.
      </p>
    </div>
  );
}
