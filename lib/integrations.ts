/** Runtime checks for third-party integrations (no secret values returned). */

import "server-only";

import { getPlatformSecretSync, ensurePlatformSecretsLoaded } from "@/lib/platform-secrets";

export type IntegrationId =
  | "stripe"
  | "twilio"
  | "resend"
  | "anthropic"
  | "mapbox"
  | "plaid";

export interface IntegrationStatus {
  id: IntegrationId;
  label: string;
  configured: boolean;
  live: boolean;
  hint?: string;
}

function isSet(key: string): boolean {
  return Boolean(getPlatformSecretSync(key));
}

export function isStripeConfigured(): boolean {
  return isSet("STRIPE_SECRET_KEY") && isSet("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
}

export function isStripeWebhookConfigured(): boolean {
  return isSet("STRIPE_WEBHOOK_SECRET");
}

export function isTwilioConfigured(): boolean {
  const sid = isSet("TWILIO_ACCOUNT_SID");
  const token = isSet("TWILIO_AUTH_TOKEN");
  const from = isSet("TWILIO_PHONE_NUMBER") || isSet("TWILIO_MESSAGING_SERVICE_SID");
  return sid && token && from;
}

export function isResendConfigured(): boolean {
  return isSet("RESEND_API_KEY");
}

export function isAnthropicConfigured(): boolean {
  return isSet("ANTHROPIC_API_KEY");
}

export function isMapboxConfigured(): boolean {
  return isSet("NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN") || isSet("MAPBOX_ACCESS_TOKEN");
}

export function isPlaidConfigured(): boolean {
  return isSet("PLAID_CLIENT_ID") && isSet("PLAID_SECRET");
}

export function isCronConfigured(): boolean {
  return isSet("CRON_SECRET");
}

export async function warmIntegrationSecrets(): Promise<void> {
  await ensurePlatformSecretsLoaded();
}

export function getIntegrationStatuses(): IntegrationStatus[] {
  const stripeOk = isStripeConfigured();
  const twilioOk = isTwilioConfigured();
  const anthropicOk = isAnthropicConfigured();

  return [
    {
      id: "stripe",
      label: "Stripe",
      configured: stripeOk,
      live: stripeOk && isStripeWebhookConfigured(),
      hint: stripeOk
        ? isStripeWebhookConfigured()
          ? "Checkout and webhooks ready"
          : "Add STRIPE_WEBHOOK_SECRET for payment confirmations"
        : "Set Stripe keys in Platform Admin → Integration keys",
    },
    {
      id: "twilio",
      label: "Twilio SMS",
      configured: twilioOk,
      live: twilioOk,
      hint: twilioOk
        ? "SMS blasts and PNM texting enabled"
        : "Set Twilio keys in Platform Admin → Integration keys",
    },
    {
      id: "resend",
      label: "Resend email",
      configured: isResendConfigured(),
      live: isResendConfigured(),
      hint: isResendConfigured() ? "Email blasts will send live" : "Set RESEND_API_KEY",
    },
    {
      id: "anthropic",
      label: "Anthropic (Claude)",
      configured: anthropicOk,
      live: anthropicOk,
      hint: anthropicOk
        ? "AI assistant, travel planner, form scan, and PNM enrich enabled"
        : "Set ANTHROPIC_API_KEY",
    },
    {
      id: "mapbox",
      label: "Mapbox",
      configured: isMapboxConfigured(),
      live: isMapboxConfigured(),
      hint: isMapboxConfigured() ? "Hometown autocomplete enabled" : "Set Mapbox token",
    },
    {
      id: "plaid",
      label: "Plaid",
      configured: isPlaidConfigured(),
      live: isPlaidConfigured(),
      hint: isPlaidConfigured() ? "Bank connect enabled" : "Set PLAID_CLIENT_ID and PLAID_SECRET",
    },
  ];
}
