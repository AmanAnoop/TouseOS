"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button, Card } from "@/components/ui";

export function StripeReturnClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams.get("org_id");
  const [message, setMessage] = useState("Syncing your Stripe account…");

  useEffect(() => {
    if (!orgId) {
      setMessage("Missing organization. Return to settings.");
      return;
    }
    async function sync() {
      const res = await fetch("/api/stripe/connect/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      const data = await res.json();
      if (res.ok && data.chargesEnabled) {
        setMessage("Stripe is connected and ready to accept payments.");
      } else if (res.ok) {
        setMessage("Stripe account saved — complete any remaining steps in Stripe if prompted.");
      } else {
        setMessage(data.error ?? "Could not verify Stripe status.");
      }
    }
    sync();
  }, [orgId]);

  return (
    <div className="max-w-md mx-auto py-16 px-4 space-y-4">
      <Card className="p-6 text-center space-y-4">
        {message.includes("Syncing") ? (
          <Loader2 className="w-10 h-10 animate-spin text-greek-600 mx-auto" />
        ) : (
          <CheckCircle className="w-10 h-10 text-green-600 mx-auto" />
        )}
        <p className="text-sm">{message}</p>
        <Link href="/settings">
          <Button className="w-full officer-touch" onClick={() => router.refresh()}>
            Back to settings
          </Button>
        </Link>
      </Card>
    </div>
  );
}
