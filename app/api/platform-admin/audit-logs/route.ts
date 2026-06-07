import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/platform-admin-auth";

export async function GET(request: Request) {
  const supabase = await createClient();
  const auth = await requirePlatformAdmin(supabase);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(200, parseInt(searchParams.get("limit") ?? "50", 10));
  const orgId = searchParams.get("org_id");
  const action = searchParams.get("action");

  const service = await createServiceClient();
  let query = service
    .from("audit_logs")
    .select("id, org_id, actor_id, action, resource_type, resource_id, metadata, created_at, organizations(name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (orgId) query = query.eq("org_id", orgId);
  if (action) query = query.ilike("action", `%${action}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const logs = (data ?? []).map((row) => {
    const org = row.organizations as { name?: string } | null;
    return {
      id: row.id,
      org_id: row.org_id,
      org_name: org?.name ?? (row.org_id ? "Organization" : "Platform"),
      actor_id: row.actor_id,
      action: row.action,
      resource_type: row.resource_type,
      resource_id: row.resource_id,
      metadata: row.metadata,
      created_at: row.created_at,
    };
  });

  return NextResponse.json({ logs });
}
