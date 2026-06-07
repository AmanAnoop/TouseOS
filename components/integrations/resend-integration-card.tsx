"use client";

import { Mail, ExternalLink } from "lucide-react";
import { Alert, Badge, Card } from "@/components/ui";

export function ResendIntegrationCard({
  configured,
  live,
}: {
  configured: boolean;
  live: boolean;
}) {
  return (
    <Card padding="sm">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-semibold text-sm flex items-center gap-2 text-foreground">
            <Mail size={16} />
            Email (Resend)
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Comms email blasts, member invites, payment reminders, and alumni campaigns.
          </p>
        </div>
        <Badge
          label={live ? "Live" : configured ? "Partial" : "Dev mode"}
          color={live ? "green" : configured ? "yellow" : "gray"}
          dot
        />
      </div>

      {!configured && (
        <Alert
          type="info"
          title="Works without setup in development"
          description="Until RESEND_API_KEY is added, emails are logged to the server console only — no messages are sent. SMS and in-app notifications still work."
          className="mt-4"
        />
      )}

      <div className="mt-4 space-y-2 text-xs text-muted-foreground">
        <p className="font-medium text-foreground text-sm">How to enable live email (5 minutes)</p>
        <ol className="list-decimal list-inside space-y-1.5">
          <li>
            Create a free account at{" "}
            <a href="https://resend.com/signup" target="_blank" rel="noopener noreferrer" className="underline text-foreground">
              resend.com
            </a>
          </li>
          <li>Resend → API Keys → Create API Key → copy the key (starts with <code className="text-[10px]">re_</code>)</li>
          <li>
            Add to <code className="text-[10px]">config/keys/keys.env</code> (local) or Platform Admin → Keys (production):
            <br />
            <code className="text-[10px] block mt-1 bg-surface-1 p-2 rounded">RESEND_API_KEY=re_...</code>
          </li>
          <li>
            <strong>Testing without a domain:</strong> leave <code className="text-[10px]">RESEND_FROM_EMAIL</code> empty — TouseOS uses{" "}
            <code className="text-[10px]">onboarding@resend.dev</code> (Resend sandbox sender).
          </li>
          <li>
            <strong>Production:</strong> verify your domain in Resend → Domains, then set{" "}
            <code className="text-[10px]">RESEND_FROM_EMAIL=Your Chapter &lt;noreply@yourdomain.com&gt;</code>
          </li>
        </ol>
      </div>

      <a
        href="https://resend.com/docs/send-with-nextjs"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-foreground underline inline-flex items-center gap-1 mt-4"
      >
        Resend + Next.js docs <ExternalLink size={12} />
      </a>
    </Card>
  );
}
