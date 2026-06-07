import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadHealthScoreForOrg } from "@/lib/health-data";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id") ?? searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const result = await loadHealthScoreForOrg(supabase, orgId, user.id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json(result);
}
