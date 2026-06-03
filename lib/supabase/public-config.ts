/**
 * Single source for browser-safe Supabase URL + anon/publishable key.
 * Validates format to catch common deploy mistakes (service role in NEXT_PUBLIC_*, placeholders).
 */

export type SupabaseKeyKind =
  | "missing"
  | "placeholder"
  | "legacy_anon_jwt"
  | "publishable"
  | "service_role_jwt"
  | "unrecognized";

export type SupabasePublicConfigValidation = {
  ok: boolean;
  url: string;
  key: string;
  keyKind: SupabaseKeyKind;
  projectRef: string | null;
  issues: string[];
};

function sanitizeEnv(raw: string | undefined): string {
  if (!raw) return "";
  let v = raw.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

/** Project URL, e.g. https://abcdefgh.supabase.co */
export function getSupabaseUrl(): string {
  return sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

/**
 * Public API key for client + SSR session refresh.
 * Supports legacy anon JWT and new publishable keys (Supabase 2025+).
 */
export function getSupabaseAnonKey(): string {
  return (
    sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  );
}

function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const part = jwt.split(".")[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json =
      typeof globalThis.atob === "function"
        ? globalThis.atob(padded)
        : Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function classifySupabaseKey(key: string): SupabaseKeyKind {
  if (!key) return "missing";

  const lower = key.toLowerCase();
  if (
    lower.includes("your-anon") ||
    lower.includes("placeholder") ||
    key === "invalid-anon-key"
  ) {
    return "placeholder";
  }

  if (key.startsWith("sb_publishable_")) return "publishable";

  if (key.startsWith("eyJ")) {
    const payload = decodeJwtPayload(key);
    const role = payload?.role;
    if (role === "service_role") return "service_role_jwt";
    return "legacy_anon_jwt";
  }

  return "unrecognized";
}

export function extractProjectRefFromUrl(url: string): string | null {
  const m = url.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co\/?$/i);
  return m?.[1] ?? null;
}

export function validateSupabasePublicConfig(): SupabasePublicConfigValidation {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  const keyKind = classifySupabaseKey(key);
  const projectRef = url ? extractProjectRefFromUrl(url.replace(/\/$/, "")) : null;
  const issues: string[] = [];

  if (!url) {
    issues.push("NEXT_PUBLIC_SUPABASE_URL is not set in this deployment.");
  } else if (!projectRef) {
    issues.push(
      "NEXT_PUBLIC_SUPABASE_URL should be https://YOUR-PROJECT-REF.supabase.co (from Supabase → Settings → API).",
    );
  }

  if (!key) {
    issues.push(
      "Set NEXT_PUBLIC_SUPABASE_ANON_KEY to the anon (public) key — Supabase → Settings → API → Project API keys → anon public (legacy) or Publishable key.",
    );
  } else if (keyKind === "placeholder") {
    issues.push("Supabase key is still a placeholder. Paste the real anon/publishable key from Supabase.");
  } else if (keyKind === "service_role_jwt") {
    issues.push(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY is set to the service_role secret. That key must never be public. Use the anon or publishable key only.",
    );
  } else if (keyKind === "unrecognized" && key.length < 40) {
    issues.push("Supabase key looks too short or invalid. Copy the full key from the Supabase dashboard.");
  }

  if (keyKind === "legacy_anon_jwt" && projectRef) {
    const payload = decodeJwtPayload(key);
    const ref = payload?.ref;
    if (typeof ref === "string" && ref !== projectRef) {
      issues.push(
        `API key is for project "${ref}" but URL is for "${projectRef}". Use matching URL and anon key from the same Supabase project.`,
      );
    }
  }

  const ok =
    issues.length === 0 &&
    Boolean(url) &&
    Boolean(key) &&
    keyKind !== "placeholder" &&
    keyKind !== "service_role_jwt" &&
    keyKind !== "missing";

  return { ok, url, key, keyKind, projectRef, issues };
}

export function isSupabaseConfigured(): boolean {
  return validateSupabasePublicConfig().ok;
}

export function getPublicAppOrigin(fallbackOrigin?: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (fallbackOrigin) return fallbackOrigin.replace(/\/$/, "");
  return "";
}
