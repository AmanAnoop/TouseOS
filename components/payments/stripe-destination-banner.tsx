"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui";

export function StripeDestinationBanner({
  orgId,
  canManage = false,
}: {
  orgId: string;
  canManage?: boolean;
}) {
  const [status, setStatus] = useState<"loading" | "connected" | "none" | "incomplete">("loading");

  useEffect(() => {
    fetch(`/api/stripe/connect?org_id=${orgId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.chargesEnabled) setStatus("connected");
        else if (d.connected) setStatus("incomplete");
        else setStatus("none");
      })
      .catch(() => setStatus("none"));
  }, [orgId]);

  if (status === "loading" || status === "connected") {
    if (status === "connected") {
      return (
        <Alert
          type="success"
          title="Chapter Stripe connected"
          description="Online dues route to your chapter bank via Stripe Connect (0.25% platform fee)."
        />
      );
    }
    return null;
  }

  return (
    <div className="space-y-2">
      <Alert
        type="warning"
        title="Online card payments are disabled"
        description={
          canManage
            ? "Connect Stripe in Settings → Integrations before members can pay dues online. Until then, use manual payment logging for cash/check."
            : "A finance officer (treasurer, president, or VP) must connect the chapter Stripe account before you can pay dues with a card. Cash/check can still be logged manually."
        }
      />
      {canManage && (
        <Link href="/settings?tab=integrations" className="text-sm font-medium underline inline-block">
          Connect Stripe →
        </Link>
      )}
    </div>
  );
}
