import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";
import { getProductId } from "@/lib/org-product";

async function assertClubMember(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, orgId: string) {
  const { data: m } = await supabase
    .from("org_members")
    .select("role, organizations(type)")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .neq("status", "removed")
    .single();

  const orgType = String(((m?.organizations as unknown) as Record<string, unknown>)?.type ?? "");
  if (!m || getProductId(orgType) !== "club") return null;
  return { role: String(m.role ?? "general_member") as RoleName };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  if (!(await assertClubMember(supabase, user.id, orgId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("club_service_hours")
    .select("*, member_profiles(full_name)")
    .eq("org_id", orgId)
    .order("event_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, memberId, memberName, hours, activity, eventDate } = await request.json();
  if (!orgId || !hours || !activity) {
    return NextResponse.json({ error: "orgId, hours, and activity required" }, { status: 400 });
  }

  const ctx = await assertClubMember(supabase, user.id, orgId);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("club_service_hours")
    .insert({
      org_id: orgId,
      member_id: memberId || null,
      member_name: memberName || null,
      hours: Number(hours),
      activity,
      event_date: eventDate || null,
      verified: can(ctx.role, "edit_roster"),
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

  const { id, orgId, verified } = await request.json();
  if (!id || !orgId) return NextResponse.json({ error: "id and orgId required" }, { status: 400 });

  const ctx = await assertClubMember(supabase, user.id, orgId);
  if (!ctx || !can(ctx.role, "edit_roster")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("club_service_hours")
    .update({ verified: Boolean(verified) })
    .eq("id", id)
    .eq("org_id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
