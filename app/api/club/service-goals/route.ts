import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";
import { getProductId } from "@/lib/org-product";

export async function GET(request: Request) {
  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: m } = await supabase
    .from("org_members")
    .select("organizations(type)")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .single();

  if (!m || getProductId(String(((m.organizations as unknown) as Record<string, unknown>)?.type ?? "")) !== "club") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data } = await supabase.from("club_service_goals").select("*").eq("org_id", orgId).maybeSingle();
  return NextResponse.json(data ?? { org_id: orgId, semester_label: "Current semester", target_hours: 100 });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, semesterLabel, targetHours } = await request.json();

  const { data: m } = await supabase
    .from("org_members")
    .select("role, organizations(type)")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .single();

  const role = String(m?.role ?? "general_member") as RoleName;
  if (getProductId(String(((m?.organizations as unknown) as Record<string, unknown>)?.type ?? "")) !== "club" || !can(role, "edit_roster")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("club_service_goals")
    .upsert({
      org_id: orgId,
      semester_label: semesterLabel ?? "Current semester",
      target_hours: Number(targetHours) || 100,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
