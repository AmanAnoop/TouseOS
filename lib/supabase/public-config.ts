/**
 * Supabase URL + anon/publishable key resolution.
 * Browser code may only read NEXT_PUBLIC_*.
 * Server routes also accept SUPABASE_URL / SUPABASE_ANON_KEY (common Vercel mistake).
 */

export type SupabaseKeyKind =
  | "missing"
  | "placeholder"
  | "legacy_anon_jwt"
  | "publishable"
  | "service_role_jwt"
  | "unrecognized";

export type SupabaseConfigValidation = {
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

/** Values available in the browser bundle (NEXT_PUBLIC_* only). */
export function getSupabaseUrlForBrowser(): string {
  return sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function getSupabaseAnonKeyForBrowser(): string {
  return (
    sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  );
}

/** Values available on the server (NEXT_PUBLIC_* or non-prefixed fallbacks). */
export function getSupabaseUrlForServer(): string {
  return getSupabaseUrlForBrowser() || sanitizeEnv(process.env.SUPABASE_URL);
}

export function getSupabaseAnonKeyForServer(): string {
  return (
    getSupabaseAnonKeyForBrowser() ||
    sanitizeEnv(process.env.SUPABASE_ANON_KEY) ||
    sanitizeEnv(process.env.SUPABASE_PUBLISHABLE_KEY)
  );
}

/** @deprecated Prefer explicit browser/server getters */
export function getSupabaseUrl(): string {
  return getSupabaseUrlForServer();
}

/** @deprecated Prefer explicit browser/server getters */
export function getSupabaseAnonKey(): string {
  return getSupabaseAnonKeyForServer();
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
  const normalized = url.replace(/\/$/, "");
  const m = normalized.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co$/i);
  return m?.[1] ?? null;
}

function buildValidation(
  url: string,
  key: string,
  label: { url: string; key: string },
): SupabaseConfigValidation {
  const keyKind = classifySupabaseKey(key);
  const projectRef = url ? extractProjectRefFromUrl(url.replace(/\/$/, "")) : null;
  const issues: string[] = [];

  if (!url) {
    issues.push(`${label.url} is not set.`);
  } else if (!projectRef) {
    issues.push(
      `${label.url} should be https://YOUR-PROJECT-REF.supabase.co (Supabase → Settings → API).`,
    );
  }

  if (!key) {
    issues.push(
      `Set ${label.key} to the anon (public) or publishable key — not the service_role secret.`,
    );
  } else if (keyKind === "placeholder") {
    issues.push("Supabase key is still a placeholder from .env.example.");
  } else if (keyKind === "service_role_jwt") {
    issues.push(
      `${label.key} is the service_role secret. Use the anon or publishable key only.`,
    );
  } else if (keyKind === "unrecognized" && key.length < 40) {
    issues.push("Supabase key looks too short. Copy the full key from the dashboard.");
  }

  if (keyKind === "legacy_anon_jwt" && projectRef) {
    const payload = decodeJwtPayload(key);
    const ref = payload?.ref;
    if (typeof ref === "string" && ref !== projectRef) {
      issues.push(
        `API key is for project "${ref}" but URL is for "${projectRef}". Use matching URL and key.`,
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

export function validateSupabaseBrowserConfig(): SupabaseConfigValidation {
  return buildValidation(getSupabaseUrlForBrowser(), getSupabaseAnonKeyForBrowser(), {
    url: "NEXT_PUBLIC_SUPABASE_URL",
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  });
}

export function validateSupabaseServerConfig(): SupabaseConfigValidation {
  const url = getSupabaseUrlForServer();
  const key = getSupabaseAnonKeyForServer();
  const browserUrl = getSupabaseUrlForBrowser();
  const browserKey = getSupabaseAnonKeyForBrowser();

  const validation = buildValidation(url, key, {
    url: browserUrl ? "NEXT_PUBLIC_SUPABASE_URL" : "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL",
    key: browserKey
      ? "NEXT_PUBLIC_SUPABASE_ANON_KEY"
      : "NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY",
  });

  if (!browserUrl && url) {
    validation.issues.push(
      "Tip: also add NEXT_PUBLIC_SUPABASE_URL (same value) and redeploy so the browser bundle is correct.",
    );
  }
  if (!browserKey && key) {
    validation.issues.push(
      "Tip: also add NEXT_PUBLIC_SUPABASE_ANON_KEY (same anon key) and redeploy.",
    );
  }

  if ((!browserUrl || !browserKey) && url && key) {
    validation.ok = true;
  }

  return validation;
}

/** @deprecated Use validateSupabaseServerConfig */
export function validateSupabasePublicConfig(): SupabaseConfigValidation {
  return validateSupabaseServerConfig();
}

/** True when server can call Supabase Auth (signup API, middleware, etc.). */
export function isSupabaseConfigured(): boolean {
  const server = validateSupabaseServerConfig();
  return server.ok && Boolean(server.url) && Boolean(server.key);
}

export function getPublicAppOrigin(fallbackOrigin?: string): string {
  const configured =
    sanitizeEnv(process.env.NEXT_PUBLIC_APP_URL) ||
    sanitizeEnv(process.env.APP_URL) ||
    sanitizeEnv(process.env.VERCEL_URL)
      ? `https://${sanitizeEnv(process.env.VERCEL_URL)}`
      : "";
  if (configured) return configured.replace(/\/$/, "");
  if (fallbackOrigin) return fallbackOrigin.replace(/\/$/, "");
  return "";
}
