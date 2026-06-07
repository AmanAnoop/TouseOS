import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const SERVER_SECRET_KEYS = new Set([
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
]);

function looksLikeSupabaseSecretKey(value: string): boolean {
  const v = value.trim();
  return v.startsWith("sb_secret_") || v.includes("service_role");
}

/** Load integration keys from config/keys/keys.env (does not override existing env vars). */
export function loadKeysFromConfigFolder(): void {
  const keysPath = resolve(process.cwd(), "config/keys/keys.env");
  if (!existsSync(keysPath)) return;

  const lines = readFileSync(keysPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!value) continue;

    if (key.startsWith("NEXT_PUBLIC_")) {
      if (SERVER_SECRET_KEYS.has(key.replace(/^NEXT_PUBLIC_/, ""))) {
        console.warn(`[keys] Refusing to load secret as ${key}`);
        continue;
      }
      if (
        (key.includes("SUPABASE") && looksLikeSupabaseSecretKey(value))
        || value.startsWith("sk_")
        || value.startsWith("sk-ant-")
        || value.startsWith("rk_")
      ) {
        console.warn(`[keys] ${key} looks like a secret key — use a server-only env var instead`);
        continue;
      }
    }

    if (!process.env[key]) process.env[key] = value;
  }
}
