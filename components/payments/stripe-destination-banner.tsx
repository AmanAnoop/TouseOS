"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui";

export function StripeDestinationBanner({ orgId }: { orgId: string }) {
  const [status, setStatus] = useState<"loading" | "connected" | "none">("loading");

  useEffect(() => {
    fetch(`/api/stripe/connect?org_id=${orgId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.chargesEnabled) setStatus("connected");
        else setStatus("none");
      })
      .catch(() => setStatus("none"));
  }, [orgId]);

  if (status !== "connected") return null;

  return (
    <div className="space-y-2">
      <Alert
        type="success"
        title="Chapter Stripe connected"
        description="Online dues and donations are routed to your chapter Stripe account."
      />
      <p className="text-xs text-muted-foreground">
        <Link href="/settings" className="text-greek-600 hover:underline">
          Manage Stripe in settings
        </Link>
      </p>
    </div>
  );
}
