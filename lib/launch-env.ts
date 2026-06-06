/**
 * Launch readiness checks for ops and GET /api/ready.
 * Does not expose secret values — only whether keys are set.
 */

export type LaunchEnvCheck = {
  key: string;
  label: string;
  required: boolean;
  ok: boolean;
  hint?: string;
};

function hasPublicSupabaseKey(): boolean {
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return (
    (typeof anon === "string" && anon.trim().length > 0) ||
    (typeof pub === "string" && pub.trim().length > 0)
  );
}

const REQUIRED: Array<{ key: string; label: string; hint?: string }> = [
  { key: "NEXT_PUBLIC_SUPABASE_URL", label: "Supabase URL" },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    label: "Supabase anon/publishable key",
    hint: "Public key only — never service_role",
  },
  { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Supabase service role", hint: "Org create, budget sync, webhooks" },
  { key: "NEXT_PUBLIC_APP_URL", label: "App URL", hint: "Must match production domain for Stripe redirects" },
];

const PAYMENTS: Array<{ key: string; label: string }> = [
  { key: "STRIPE_SECRET_KEY", label: "Stripe secret" },
  { key: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", label: "Stripe publishable" },
  { key: "STRIPE_WEBHOOK_SECRET", label: "Stripe webhook secret" },
];

const PRODUCTION: Array<{ key: string; label: string; hint?: string }> = [
  { key: "CRON_SECRET", label: "Cron secret", hint: "Protects /api/cron/* in production" },
];

const OPTIONAL: Array<{ key: string; label: string }> = [
  { key: "RESEND_API_KEY", label: "Resend (email blasts)" },
  { key: "TWILIO_ACCOUNT_SID", label: "Twilio SMS" },
  { key: "ANTHROPIC_API_KEY", label: "Anthropic (AI assistant)" },
  { key: "OPENAI_API_KEY", label: "OpenAI (forms scan, PNM)" },
  { key: "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN", label: "Mapbox (hometown autocomplete)" },
  { key: "PLAID_CLIENT_ID", label: "Plaid (bank connect)" },
  { key: "NEXT_PUBLIC_VAPID_PUBLIC_KEY", label: "Web push (public)" },
  { key: "VAPID_PRIVATE_KEY", label: "Web push (private)" },
];

import { getPlatformSecretSync } from "@/lib/platform-secrets";

function isSet(key: string): boolean {
  return Boolean(getPlatformSecretSync(key));
}

export function getLaunchEnvChecks(): LaunchEnvCheck[] {
  const checks: LaunchEnvCheck[] = [];

  for (const item of REQUIRED) {
    const ok =
      item.key === "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        ? hasPublicSupabaseKey()
        : isSet(item.key);
    checks.push({
      key: item.key,
      label: item.label,
      required: true,
      ok,
      hint: item.hint,
    });
  }

  for (const item of PAYMENTS) {
    checks.push({
      key: item.key,
      label: item.label,
      required: false,
      ok: isSet(item.key),
      hint: "Required for live card payments",
    });
  }

  for (const item of PRODUCTION) {
    const isProd = process.env.NODE_ENV === "production";
    checks.push({
      key: item.key,
      label: item.label,
      required: isProd,
      ok: isSet(item.key),
      hint: item.hint,
    });
  }

  for (const item of OPTIONAL) {
    checks.push({
      key: item.key,
      label: item.label,
      required: false,
      ok: isSet(item.key),
    });
  }

  return checks;
}

export function getLaunchReadiness() {
  const checks = getLaunchEnvChecks();
  const required = checks.filter((c) => c.required);
  const requiredOk = required.every((c) => c.ok);
  const paymentsOk = PAYMENTS.every((p) => isSet(p.key));
  const optionalOk = checks.filter((c) => !c.required && c.ok).length;

  const requiredScore = required.length
    ? Math.round((required.filter((c) => c.ok).length / required.length) * 100)
    : 100;
  const paymentsScore = paymentsOk ? 100 : Math.round(
    (PAYMENTS.filter((p) => isSet(p.key)).length / PAYMENTS.length) * 100,
  );

  /** Weighted launch-env slice (not full product %) */
  const envScore = Math.round(requiredScore * 0.6 + paymentsScore * 0.3 + Math.min(100, optionalOk * 15) * 0.1);

  return {
    checks,
    requiredOk,
    paymentsOk,
    envScore,
    readyForPilot: requiredOk,
    readyForPaidDues: requiredOk && paymentsOk,
  };
}
