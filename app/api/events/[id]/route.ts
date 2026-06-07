import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";

async function memberRole(
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
  return String(data?.role ?? "") as RoleName;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { orgId } = body;
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const role = await memberRole(supabase, user.id, orgId);
  if (!can(role, "manage_events")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const fields: Record<string, string> = {
    title: "title",
    type: "type",
    description: "description",
    location: "location",
    address: "address",
    startsAt: "starts_at",
    endsAt: "ends_at",
    dresscode: "dress_code",
    playlistUrl: "playlist_url",
    theme: "theme",
    riskLevel: "risk_level",
    status: "status",
  };

  for (const [key, col] of Object.entries(fields)) {
    if (body[key] !== undefined) updates[col] = body[key];
  }

  if (body.rsvpEnabled !== undefined) updates.rsvp_enabled = body.rsvpEnabled;
  if (body.rsvpLimit !== undefined) updates.rsvp_limit = body.rsvpLimit;
  if (body.waitlistEnabled !== undefined) updates.waitlist_enabled = body.waitlistEnabled;
  if (body.showGuestList !== undefined) updates.show_guest_list = body.showGuestList;
  if (body.alcohol !== undefined) updates.alcohol = body.alcohol;
  if (body.budgetAmount !== undefined) updates.budget_amount = body.budgetAmount;
  if (body.isPrivate !== undefined) updates.is_private = body.isPrivate;
  if (body.coverImageUrl !== undefined) updates.cover_image_url = body.coverImageUrl;
  if (body.isPointOpportunity !== undefined) updates.is_point_opportunity = body.isPointOpportunity;
  if (body.pointValue !== undefined) updates.point_value = body.pointValue;
  if (body.pointCategory !== undefined) updates.point_category = body.pointCategory;
  if (body.pointGateMin !== undefined) updates.point_gate_min = body.pointGateMin;
  if (body.pointGateCategory !== undefined) updates.point_gate_category = body.pointGateCategory;

  if (Object.keys(updates).length <= 1) {
    return NextResponse.json({ error: "No updates" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("events")
    .update(updates)
    .eq("id", id)
    .eq("org_id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
