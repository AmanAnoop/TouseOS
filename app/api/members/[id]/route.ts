import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";

async function roleForOrg(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  orgId: string,
): Promise<RoleName> {
  const { data } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .neq("status", "removed")
    .maybeSingle();
  return String(data?.role ?? "general_member") as RoleName;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { orgId, committees, fullName, phone, classYear, major, hometown } = body;

  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const role = await roleForOrg(supabase, user.id, orgId);
  if (!can(role, "edit_roster")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: existing } = await supabase
    .from("member_profiles")
    .select("id, org_id")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (committees !== undefined) {
    updates.committees = Array.isArray(committees)
      ? committees.map((c: string) => String(c).trim()).filter(Boolean)
      : [];
  }
  if (fullName !== undefined) updates.full_name = fullName;
  if (phone !== undefined) updates.phone = phone;
  if (classYear !== undefined) updates.class_year = classYear;
  if (major !== undefined) updates.major = major;
  if (hometown !== undefined) updates.hometown = hometown;

  const { data, error } = await supabase
    .from("member_profiles")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "member_updated",
    resource_type: "member_profiles",
    resource_id: id,
    metadata: { fields: Object.keys(updates) },
  });

  return NextResponse.json(data);
}
