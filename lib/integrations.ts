/** Runtime checks for third-party integrations (no secret values returned). */

export type IntegrationId = "stripe" | "twilio" | "resend" | "openai";

export interface IntegrationStatus {
  id: IntegrationId;
  label: string;
  configured: boolean;
  live: boolean;
  hint?: string;
}

function isSet(key: string): boolean {
  const v = process.env[key];
  return typeof v === "string" && v.trim().length > 0;
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

export function isOpenAiConfigured(): boolean {
  return isSet("OPENAI_API_KEY");
}

export function getIntegrationStatuses(): IntegrationStatus[] {
  const stripeOk = isStripeConfigured();
  const twilioOk = isTwilioConfigured();

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
        : "Set STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    },
    {
      id: "twilio",
      label: "Twilio SMS",
      configured: twilioOk,
      live: twilioOk,
      hint: twilioOk
        ? "SMS blasts and PNM texting enabled"
        : "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_MESSAGING_SERVICE_SID or TWILIO_PHONE_NUMBER",
    },
    {
      id: "resend",
      label: "Resend email",
      configured: isResendConfigured(),
      live: isResendConfigured(),
      hint: isResendConfigured() ? "Email blasts will send live" : "Set RESEND_API_KEY for live email",
    },
    {
      id: "openai",
      label: "OpenAI",
      configured: isOpenAiConfigured(),
      live: isOpenAiConfigured(),
      hint: isOpenAiConfigured() ? "AI assistant enabled" : "Set OPENAI_API_KEY",
    },
  ];
}
