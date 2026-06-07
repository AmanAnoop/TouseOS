import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getStoredFeatureFlags, saveFeatureFlags } from "@/lib/platform-feature-flags";
import { requirePlatformAdmin } from "@/lib/platform-admin-auth";

export async function GET() {
  const supabase = await createClient();
  const auth = await requirePlatformAdmin(supabase);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const service = await createServiceClient();
  const flags = await getStoredFeatureFlags(service);
  return NextResponse.json({ flags, source: "database" });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const auth = await requirePlatformAdmin(supabase);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { flags } = await request.json();
  if (!flags || typeof flags !== "object") {
    return NextResponse.json({ error: "flags object required" }, { status: 400 });
  }

  const service = await createServiceClient();
  const result = await saveFeatureFlags(service, flags as Record<string, boolean>);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });

  await service.from("audit_logs").insert({
    org_id: null,
    actor_id: (await supabase.auth.getUser()).data.user?.id,
    action: "platform_feature_flags_updated",
    resource_type: "platform_settings",
    resource_id: "feature_flags",
    metadata: { flags },
  });

  return NextResponse.json({ flags: await getStoredFeatureFlags(service) });
}
