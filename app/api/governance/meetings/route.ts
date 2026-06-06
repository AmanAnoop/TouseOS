import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("governance_meetings")
    .select("*")
    .eq("org_id", orgId)
    .order("scheduled_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { orgId, title, meetingType, scheduledAt, location, agenda, quorumRequired } = body;
  if (!orgId || !title) {
    return NextResponse.json({ error: "orgId and title required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .single();

  const role = String(membership?.role ?? "general_member") as RoleName;
  if (!can(role, "manage_org_settings")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("governance_meetings")
    .insert({
      org_id: orgId,
      title,
      meeting_type: meetingType || "chapter_meeting",
      scheduled_at: scheduledAt || null,
      location: location || null,
      agenda: agenda || null,
      quorum_required: parseInt(String(quorumRequired ?? "0"), 10) || 0,
      status: "scheduled",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, orgId, quorumPresent, minutes } = await request.json();
  if (!id || !orgId) {
    return NextResponse.json({ error: "id and orgId required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (quorumPresent !== undefined) updates.quorum_present = quorumPresent;
  if (minutes !== undefined) updates.minutes = minutes;

  const { data, error } = await supabase
    .from("governance_meetings")
    .update(updates)
    .eq("id", id)
    .eq("org_id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
