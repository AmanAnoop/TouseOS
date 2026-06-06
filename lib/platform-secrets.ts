import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const SETTINGS_KEY = "integration_secrets_encrypted";
const ALGO = "aes-256-gcm";
const SALT = "touseos-platform-secrets-v1";

let cache: Record<string, string> | null = null;
let cacheLoaded = false;

function deriveKey(): Buffer {
  const secret =
    process.env.PLATFORM_SECRETS_KEY?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) {
    throw new Error("PLATFORM_SECRETS_KEY or SUPABASE_SERVICE_ROLE_KEY required to store integration keys");
  }
  return scryptSync(secret, SALT, 32);
}

function encryptBlob(secrets: Record<string, string>): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, deriveKey(), iv);
  const payload = JSON.stringify(secrets);
  const enc = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: enc.toString("base64"),
  });
}

function decryptBlob(raw: string): Record<string, string> {
  const parsed = JSON.parse(raw) as { iv: string; tag: string; data: string };
  const decipher = createDecipheriv(ALGO, deriveKey(), Buffer.from(parsed.iv, "base64"));
  decipher.setAuthTag(Buffer.from(parsed.tag, "base64"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(parsed.data, "base64")),
    decipher.final(),
  ]);
  const obj = JSON.parse(dec.toString("utf8")) as Record<string, string>;
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => typeof v === "string" && v.trim().length > 0),
  );
}

export function invalidatePlatformSecretsCache(): void {
  cache = null;
  cacheLoaded = false;
}

async function loadFromDatabase(service: SupabaseClient): Promise<Record<string, string>> {
  const { data } = await service
    .from("platform_settings")
    .select("value")
    .eq("key", SETTINGS_KEY)
    .maybeSingle();

  const value = data?.value;
  if (!value || typeof value !== "object") return {};

  const encrypted = (value as { encrypted?: string }).encrypted;
  if (!encrypted || typeof encrypted !== "string") return {};

  try {
    return decryptBlob(encrypted);
  } catch {
    return {};
  }
}

export async function ensurePlatformSecretsLoaded(service?: SupabaseClient): Promise<void> {
  if (cacheLoaded) return;
  if (service) {
    cache = await loadFromDatabase(service);
  } else {
    try {
      const { createServiceClient } = await import("@/lib/supabase/server");
      const db = await createServiceClient();
      cache = await loadFromDatabase(db);
    } catch {
      cache = {};
    }
  }
  cacheLoaded = true;
}

export function getPlatformSecretSync(key: string): string | undefined {
  const env = process.env[key]?.trim();
  if (env) return env;
  return cache?.[key]?.trim() || undefined;
}

export async function getPlatformSecret(key: string): Promise<string | undefined> {
  const env = process.env[key]?.trim();
  if (env) return env;
  await ensurePlatformSecretsLoaded();
  return cache?.[key]?.trim() || undefined;
}

export async function getStoredPlatformSecrets(service: SupabaseClient): Promise<Record<string, string>> {
  return loadFromDatabase(service);
}

export async function savePlatformSecrets(
  service: SupabaseClient,
  updates: Record<string, string | null>,
): Promise<{ error?: string }> {
  const existing = await loadFromDatabase(service);
  const merged = { ...existing };

  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === "") {
      delete merged[key];
    } else {
      merged[key] = value.trim();
    }
  }

  const encrypted = encryptBlob(merged);
  const { error } = await service.from("platform_settings").upsert({
    key: SETTINGS_KEY,
    value: { encrypted, updated_at: new Date().toISOString() },
    updated_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };

  cache = merged;
  cacheLoaded = true;
  return {};
}

export function maskSecretValue(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const v = value.trim();
  if (v.length <= 8) return "••••••••";
  return `••••${v.slice(-4)}`;
}
