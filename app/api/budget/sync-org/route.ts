import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { triggerBudgetSyncForOrg } from "@/lib/budget-auto-sync";

/** Sync the org's latest budget after client-side finance mutations. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId } = await request.json();
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  await triggerBudgetSyncForOrg(orgId, user.id);
  return NextResponse.json({ success: true });
}
