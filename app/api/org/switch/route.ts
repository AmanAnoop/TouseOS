import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { activeOrgCookieHeader } from "@/lib/active-org-cookie";
import { homePathForOrgType } from "@/lib/resolve-home";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId } = await request.json();
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id, organizations(type)")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .neq("status", "removed")
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
  }

  const org = membership.organizations as { type?: string } | { type?: string }[] | null;
  const orgType = Array.isArray(org) ? org[0]?.type : org?.type;
  const redirectTo = homePathForOrgType(orgType);

  const res = NextResponse.json({ success: true, redirectTo, orgId });
  res.headers.set("Set-Cookie", activeOrgCookieHeader(orgId));
  return res;
}
