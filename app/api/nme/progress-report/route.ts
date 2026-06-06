import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  const role = String(membership?.role ?? "general_member") as RoleName;
  if (!can(role, "view_reports") && !can(role, "manage_nme")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [{ data: modules }, { data: members }, { data: progress }] = await Promise.all([
    supabase.from("nme_modules").select("id, title, is_required").eq("org_id", orgId),
    supabase.from("member_profiles").select("id, full_name, email, membership_status").eq("org_id", orgId).in("membership_status", ["active", "new_member"]),
    supabase.from("nme_progress").select("member_id, module_id, completed, score").eq("org_id", orgId).eq("completed", true),
  ]);

  const required = (modules ?? []).filter((m) => m.is_required);
  const requiredIds = new Set(required.map((m) => m.id));
  const doneByMember = new Map<string, number>();
  for (const p of progress ?? []) {
    if (!requiredIds.has(String(p.module_id))) continue;
    const mid = String(p.member_id);
    doneByMember.set(mid, (doneByMember.get(mid) ?? 0) + 1);
  }

  const rows = (members ?? []).map((m) => {
    const done = doneByMember.get(String(m.id)) ?? 0;
    return {
      member_id: m.id,
      full_name: m.full_name,
      email: m.email,
      required_total: required.length,
      required_complete: done,
      all_done: required.length === 0 || done >= required.length,
    };
  });

  return NextResponse.json({ rows, requiredTotal: required.length });
}
