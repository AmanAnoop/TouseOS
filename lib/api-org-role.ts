import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { can, type Permission, type RoleName } from "@/lib/permissions";

export async function getMemberRole(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
): Promise<RoleName | null> {
  const { data } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .neq("status", "removed")
    .maybeSingle();
  return (data?.role as RoleName) ?? null;
}

export function forbidUnless(
  role: RoleName | null,
  permission: Permission,
): NextResponse | null {
  if (!role || !can(role, permission)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
