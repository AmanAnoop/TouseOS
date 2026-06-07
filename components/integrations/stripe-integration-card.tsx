"use client";

import Link from "next/link";
import { CreditCard, ExternalLink } from "lucide-react";
import { Alert, Badge, Card } from "@/components/ui";
import { StripeConnectPanel } from "@/components/settings/stripe-connect-panel";

const ENV_KEYS = [
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
] as const;

interface StripeIntegrationCardProps {
  orgId: string;
  stripeAccountId: string | null;
  platformConfigured: boolean;
  platformReachable: boolean | null;
  webhookConfigured: boolean;
}

export function StripeIntegrationCard({
  orgId,
  stripeAccountId,
  platformConfigured,
  platformReachable,
  webhookConfigured,
}: StripeIntegrationCardProps) {
  const platformLive = platformConfigured && platformReachable !== false;
  const chapterConnected = Boolean(stripeAccountId);

  return (
    <div className="space-y-4">
      <Card padding="sm">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="font-semibold text-sm flex items-center gap-2 text-foreground">
              <CreditCard size={16} />
              Stripe payments
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Platform keys power checkout; each chapter connects its own Stripe account for payouts.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              label={platformLive ? "Platform live" : platformConfigured ? "Platform partial" : "Platform not configured"}
              color={platformLive ? "green" : platformConfigured ? "yellow" : "gray"}
              dot
            />
            <Badge
              label={chapterConnected ? "Chapter connected" : "Chapter not connected"}
              color={chapterConnected ? "green" : "gray"}
              dot
            />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <p className="type-label" style={{ marginBottom: 8 }}>Server environment (Vercel / host)</p>
          <ul className="text-xs text-muted-foreground space-y-1 font-mono">
            {ENV_KEYS.map((key) => (
              <li key={key} className="bg-bg-subtle px-2 py-1 rounded">{key}</li>
            ))}
          </ul>
          {!webhookConfigured && platformConfigured && (
            <Alert
              type="warning"
              title="Webhook secret missing"
              description="Add STRIPE_WEBHOOK_SECRET so paid dues and donations update automatically."
            />
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <a
            href="https://dashboard.stripe.com/webhooks"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-foreground underline inline-flex items-center gap-1"
          >
            Stripe webhook dashboard <ExternalLink size={12} />
          </a>
          <Link href="/payments" className="text-xs text-foreground underline">
            Chapter payments →
          </Link>
        </div>
      </Card>

      <StripeConnectPanel orgId={orgId} initialAccountId={stripeAccountId} />
    </div>
  );
}
