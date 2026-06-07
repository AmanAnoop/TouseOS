/** Server-only secret keys — must never use NEXT_PUBLIC_ prefix. */
export const SERVER_SECRET_ENV_KEYS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "TWILIO_AUTH_TOKEN",
  "ANTHROPIC_API_KEY",
  "RESEND_API_KEY",
  "MAPBOX_ACCESS_TOKEN",
  "PLAID_SECRET",
  "VAPID_PRIVATE_KEY",
  "CRON_SECRET",
  "CLERK_SECRET_KEY",
  "PLATFORM_SECRETS_KEY",
  "RADAR_SECRET_KEY",
] as const;

/** Keys safe to embed in the browser bundle (publishable / public tokens only). */
export const CLIENT_SAFE_PUBLIC_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "NEXT_PUBLIC_RADAR_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
] as const;

export function looksLikeSupabaseSecretKey(value: string): boolean {
  const v = value.trim();
  return v.startsWith("sb_secret_") || v.includes("service_role");
}
