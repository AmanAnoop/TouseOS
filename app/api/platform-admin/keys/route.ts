import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/platform-admin-auth";
import {
  INTEGRATION_KEY_CATALOG,
  INTEGRATION_KEY_GROUPS,
  type IntegrationKeyGroup,
} from "@/lib/integration-key-catalog";
import {
  getStoredPlatformSecrets,
  savePlatformSecrets,
  maskSecretValue,
  invalidatePlatformSecretsCache,
} from "@/lib/platform-secrets";
import { getProductDepthReport } from "@/lib/product-depth";
import { warmIntegrationSecrets } from "@/lib/integrations";

function keyStatus(key: string, envVal?: string, dbVal?: string) {
  const fromEnv = Boolean(envVal?.trim());
  const fromDb = Boolean(dbVal?.trim());
  const value = envVal?.trim() || dbVal?.trim();
  return {
    key,
    configured: fromEnv || fromDb,
    source: fromEnv ? "environment" as const : fromDb ? "database" as const : null,
    masked: maskSecretValue(value),
    locked: fromEnv,
  };
}

export async function GET() {
  const supabase = await createClient();
  const auth = await requirePlatformAdmin(supabase);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const service = await createServiceClient();
  const stored = await getStoredPlatformSecrets(service);
  await warmIntegrationSecrets();

  const keys = INTEGRATION_KEY_CATALOG.map((def) => ({
    ...def,
    ...keyStatus(def.key, process.env[def.key], stored[def.key]),
  }));

  const grouped = (Object.keys(INTEGRATION_KEY_GROUPS) as IntegrationKeyGroup[]).map((group) => ({
    id: group,
    label: INTEGRATION_KEY_GROUPS[group],
    keys: keys.filter((k) => k.group === group),
  }));

  const depth = getProductDepthReport();

  return NextResponse.json({
    keys,
    grouped,
    depth,
    note: "Environment variables take precedence over values saved here. Keys stored in the database are encrypted at rest.",
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const auth = await requirePlatformAdmin(supabase);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const secrets = body.secrets as Record<string, string | null> | undefined;
  if (!secrets || typeof secrets !== "object") {
    return NextResponse.json({ error: "secrets object required" }, { status: 400 });
  }

  const allowed = new Set(INTEGRATION_KEY_CATALOG.map((k) => k.key));
  const updates: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(secrets)) {
    if (!allowed.has(key)) continue;
    if (process.env[key]?.trim()) continue;
    updates[key] = value;
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "No savable keys — env vars are locked or no values provided" }, { status: 400 });
  }

  const service = await createServiceClient();
  const result = await savePlatformSecrets(service, updates);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });

  invalidatePlatformSecretsCache();
  await warmIntegrationSecrets();

  const { data: { user } } = await supabase.auth.getUser();
  await service.from("audit_logs").insert({
    org_id: null,
    actor_id: user?.id,
    action: "platform_integration_keys_updated",
    resource_type: "platform_settings",
    resource_id: "integration_secrets_encrypted",
    metadata: { keys: Object.keys(updates) },
  });

  return NextResponse.json({ success: true, updated: Object.keys(updates) });
}
