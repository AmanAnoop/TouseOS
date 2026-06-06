export type IntegrationKeyGroup =
  | "core"
  | "payments"
  | "messaging"
  | "ai"
  | "maps"
  | "finance"
  | "push";

export interface IntegrationKeyDef {
  key: string;
  label: string;
  group: IntegrationKeyGroup;
  description?: string;
  secret?: boolean;
  public?: boolean;
}

export const INTEGRATION_KEY_GROUPS: Record<IntegrationKeyGroup, string> = {
  core: "Core deployment",
  payments: "Payments (Stripe)",
  messaging: "Messaging & email",
  ai: "AI services",
  maps: "Maps & places",
  finance: "Bank linking (Plaid)",
  push: "Web push notifications",
};

export const INTEGRATION_KEY_CATALOG: IntegrationKeyDef[] = [
  { key: "NEXT_PUBLIC_APP_URL", label: "App URL", group: "core", description: "Production URL for redirects and webhooks", public: true },
  { key: "CRON_SECRET", label: "Cron secret", group: "core", description: "Protects /api/cron/* in production", secret: true },
  { key: "STRIPE_SECRET_KEY", label: "Stripe secret key", group: "payments", secret: true },
  { key: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", label: "Stripe publishable key", group: "payments", public: true },
  { key: "STRIPE_WEBHOOK_SECRET", label: "Stripe webhook secret", group: "payments", secret: true },
  { key: "TWILIO_ACCOUNT_SID", label: "Twilio Account SID", group: "messaging", public: true },
  { key: "TWILIO_AUTH_TOKEN", label: "Twilio Auth Token", group: "messaging", secret: true },
  { key: "TWILIO_PHONE_NUMBER", label: "Twilio phone number", group: "messaging", public: true },
  { key: "TWILIO_MESSAGING_SERVICE_SID", label: "Twilio Messaging Service SID", group: "messaging", public: true },
  { key: "RESEND_API_KEY", label: "Resend API key", group: "messaging", secret: true },
  { key: "RESEND_FROM_EMAIL", label: "Resend from email", group: "messaging", public: true },
  { key: "ANTHROPIC_API_KEY", label: "Anthropic API key (AI assistant)", group: "ai", secret: true },
  { key: "OPENAI_API_KEY", label: "OpenAI API key (forms scan, PNM)", group: "ai", secret: true },
  { key: "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN", label: "Mapbox public token", group: "maps", public: true },
  { key: "MAPBOX_ACCESS_TOKEN", label: "Mapbox server token", group: "maps", secret: true },
  { key: "PLAID_CLIENT_ID", label: "Plaid client ID", group: "finance", public: true },
  { key: "PLAID_SECRET", label: "Plaid secret", group: "finance", secret: true },
  { key: "PLAID_ENV", label: "Plaid environment", group: "finance", public: true },
  { key: "NEXT_PUBLIC_VAPID_PUBLIC_KEY", label: "VAPID public key", group: "push", public: true },
  { key: "VAPID_PRIVATE_KEY", label: "VAPID private key", group: "push", secret: true },
];
