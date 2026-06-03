import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ADMIN_ROLES = ["owner", "president", "advisor"];

async function membershipRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  orgId: string,
) {
  const { data } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .neq("status", "removed")
    .maybeSingle();
  return String(data?.role ?? "");
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, memberId, role, status } = await request.json();
  if (!orgId || !memberId) {
    return NextResponse.json({ error: "orgId and memberId required" }, { status: 400 });
  }

  const myRole = await membershipRole(supabase, user.id, orgId);
  if (!ADMIN_ROLES.includes(myRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if (role !== undefined) updates.role = role;
  if (status !== undefined) updates.status = status;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "role or status required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("org_members")
    .update(updates)
    .eq("id", memberId)
    .eq("org_id", orgId)
    .select("*, profiles(full_name, avatar_url), member_profiles(id, full_name, email)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
