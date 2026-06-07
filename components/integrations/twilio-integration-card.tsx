"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquare, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import { Alert, Badge, Button, Card, Input } from "@/components/ui";

const ENV_KEYS = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_MESSAGING_SERVICE_SID (or TWILIO_PHONE_NUMBER)",
] as const;

interface TwilioIntegrationCardProps {
  orgId: string;
  configured: boolean;
  live: boolean;
  canTest: boolean;
}

export function TwilioIntegrationCard({
  orgId,
  configured,
  live,
  canTest,
}: TwilioIntegrationCardProps) {
  const [testing, setTesting] = useState(false);

  async function sendTest() {
    if (!orgId) return;
    setTesting(true);
    const res = await fetch("/api/integrations/twilio-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId }),
    });
    setTesting(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error((data as { error?: string }).error ?? "Test failed");
      return;
    }
    toast.success(`Test SMS sent to ${(data as { to?: string }).to ?? "your phone"}`);
  }

  return (
    <Card padding="sm">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-semibold text-sm flex items-center gap-2 text-foreground">
            <MessageSquare size={16} />
            Twilio SMS
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PNM texting, comms blasts, and task assignment texts. Each message is prefixed with your chapter name from Settings → Profile. Includes STOP/HELP and quiet hours (9pm–9am).
          </p>
        </div>
        <Badge
          label={live ? "Live" : configured ? "Partial" : "Not configured"}
          color={live ? "green" : configured ? "yellow" : "gray"}
          dot
        />
      </div>

      {!configured && (
        <Alert
          type="info"
          title="Configure Twilio on the server"
          description="Add the environment variables below in Vercel (or your host). Keys are never stored in the database."
          className="mt-4"
        />
      )}

      <div className="mt-4 space-y-2">
        <p className="type-label" style={{ marginBottom: 8 }}>Server environment</p>
        <ul className="text-xs text-muted-foreground space-y-1 font-mono">
          {ENV_KEYS.map((key) => (
            <li key={key} className="bg-bg-subtle px-2 py-1 rounded">{key}</li>
          ))}
        </ul>
      </div>

      <div className="mt-4 space-y-3">
        <p className="text-xs text-muted-foreground">
          Webhook URL for inbound SMS (configure in Twilio console):
        </p>
        <Input
          readOnly
          value={`${typeof window !== "undefined" ? window.location.origin : ""}/api/twilio/webhook`}
          onFocus={(e) => e.target.select()}
        />
      </div>

      <div className="flex flex-wrap gap-2 mt-4 items-center">
        {canTest && live && (
          <Button size="sm" loading={testing} onClick={sendTest}>
            Send test SMS to my phone
          </Button>
        )}
        <Link href="/comms" className="text-xs text-foreground underline">
          Open comms →
        </Link>
        <a
          href="https://www.twilio.com/docs/messaging"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-foreground underline inline-flex items-center gap-1"
        >
          Twilio docs <ExternalLink size={12} />
        </a>
      </div>

      {canTest && !live && (
        <p className="text-xs text-muted-foreground mt-2">
          You need send_mass_texts permission and a phone number on your profile to run tests once Twilio is live.
        </p>
      )}
    </Card>
  );
}
