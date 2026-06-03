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
  | "secret_key"
  | "service_role_jwt"
  | "unrecognized";

/** Which env var names are non-empty (never includes values). */
export type SupabaseEnvPresence = {
  NEXT_PUBLIC_SUPABASE_URL: boolean;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: boolean;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: boolean;
  SUPABASE_URL: boolean;
  SUPABASE_ANON_KEY: boolean;
  SUPABASE_PUBLISHABLE_KEY: boolean;
};

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
  let v = raw.trim().replace(/\s+/g, "");
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim().replace(/\s+/g, "");
  }
  return v;
}

export function getSupabaseEnvPresence(): SupabaseEnvPresence {
  const check = (key: string) => {
    const v = process.env[key];
    return typeof v === "string" && sanitizeEnv(v).length > 0;
  };
  return {
    NEXT_PUBLIC_SUPABASE_URL: check("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: check("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: check("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    SUPABASE_URL: check("SUPABASE_URL"),
    SUPABASE_ANON_KEY: check("SUPABASE_ANON_KEY"),
    SUPABASE_PUBLISHABLE_KEY: check("SUPABASE_PUBLISHABLE_KEY"),
  };
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

  if (key.startsWith("sb_secret_")) return "secret_key";
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
  } else if (keyKind === "secret_key") {
    issues.push(
      `${label.key} is a secret key (sb_secret_...). Remove it from all NEXT_PUBLIC_* variables. Use NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY with the publishable value only.`,
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
    keyKind !== "secret_key" &&
    keyKind !== "missing";

  return { ok, url, key, keyKind, projectRef, issues };
}

export function validateSupabaseBrowserConfig(): SupabaseConfigValidation {
  return buildValidation(getSupabaseUrlForBrowser(), getSupabaseAnonKeyForBrowser(), {
    url: "NEXT_PUBLIC_SUPABASE_URL",
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  });
}

export function validateSupabaseServerConfig(): SupabaseConfigValidation {
  const url = getSupabaseUrlForServer();
  const key = getSupabaseAnonKeyForServer();
  const browserUrl = getSupabaseUrlForBrowser();
  const browserKey = getSupabaseAnonKeyForBrowser();
  const presence = getSupabaseEnvPresence();

  const validation = buildValidation(url, key, {
    url: "NEXT_PUBLIC_SUPABASE_URL",
    key: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)",
  });

  if (!presence.NEXT_PUBLIC_SUPABASE_URL && !presence.SUPABASE_URL) {
    validation.issues.push(
      "In Vercel, add NEXT_PUBLIC_SUPABASE_URL (example: https://giwnjysprfizhspzfakz.supabase.co) — one line, no quotes.",
    );
  }

  if (
    !presence.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    !presence.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !presence.SUPABASE_PUBLISHABLE_KEY &&
    !presence.SUPABASE_ANON_KEY
  ) {
    validation.issues.push(
      "In Vercel, add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = your sb_publishable_... key (not sb_secret_...).",
    );
  }

  if (presence.NEXT_PUBLIC_SUPABASE_ANON_KEY && classifySupabaseKey(sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) === "secret_key") {
    validation.ok = false;
    validation.issues.push("NEXT_PUBLIC_SUPABASE_ANON_KEY contains a secret key — use the publishable key in NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY instead.");
  }

  if (!browserUrl && url) {
    validation.issues.push(
      "Redeploy: NEXT_PUBLIC_SUPABASE_URL must exist before build so the client bundle can use it.",
    );
  }
  if (!browserKey && key) {
    validation.issues.push(
      "Redeploy: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must exist before build so the client bundle can use it.",
    );
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
