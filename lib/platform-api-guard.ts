import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getStoredFeatureFlags } from "@/lib/platform-feature-flags";

export async function requirePlatformFeature(
  flag: string,
): Promise<NextResponse | null> {
  const service = await createServiceClient();
  const flags = await getStoredFeatureFlags(service);
  if (flags[flag] === false) {
    return NextResponse.json({ error: "This feature is disabled by platform admin" }, { status: 403 });
  }
  return null;
}
