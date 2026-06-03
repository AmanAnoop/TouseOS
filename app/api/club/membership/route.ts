import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";
import { getProductId } from "@/lib/org-product";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data: m } = await supabase
    .from("org_members")
    .select("role, organizations(type)")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .neq("status", "removed")
    .single();

  if (!m || getProductId(String(((m.organizations as unknown) as Record<string, unknown>)?.type ?? "")) !== "club") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("club_membership_applications")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { orgId, fullName, email, classYear, interests, notes } = body;
  if (!orgId || !fullName) {
    return NextResponse.json({ error: "orgId and fullName required" }, { status: 400 });
  }

  const { data: m } = await supabase
    .from("org_members")
    .select("role, organizations(type)")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .neq("status", "removed")
    .single();

  const role = String(m?.role ?? "general_member") as RoleName;
  const orgType = String(((m?.organizations as unknown) as Record<string, unknown>)?.type ?? "");
  if (getProductId(orgType) !== "club" || !can(role, "edit_roster")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("club_membership_applications")
    .insert({
      org_id: orgId,
      full_name: fullName,
      email: email || null,
      class_year: classYear || null,
      interests: interests || null,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, orgId, status, notes } = await request.json();
  if (!id || !orgId) return NextResponse.json({ error: "id and orgId required" }, { status: 400 });

  const { data: m } = await supabase
    .from("org_members")
    .select("role, organizations(type)")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .neq("status", "removed")
    .single();

  const role = String(m?.role ?? "general_member") as RoleName;
  const orgType = String(((m?.organizations as unknown) as Record<string, unknown>)?.type ?? "");
  if (getProductId(orgType) !== "club" || !can(role, "edit_roster")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("club_membership_applications")
    .update({ status, notes, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("org_id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
