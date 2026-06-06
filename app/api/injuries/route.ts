import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";

const INJURY_ROLES: RoleName[] = [
  "captain", "co_captain", "coach", "safety_officer", "owner", "president", "advisor",
];

function canAccessInjuries(role: RoleName): boolean {
  return INJURY_ROLES.includes(role) || can(role, "view_injuries") || can(role, "manage_injuries");
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    orgId, memberId, incidentDate, context, injuryType, bodyArea, severity,
    description, actionTaken, trainerReferred, returnToPlayDate,
  } = body;

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .single();

  const role = String(membership?.role ?? "general_member") as RoleName;
  if (!canAccessInjuries(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase.from("sports_injuries").insert({
    org_id: orgId,
    member_id: memberId,
    incident_date: incidentDate,
    context: context ?? "practice",
    body_area: bodyArea,
    injury_type: injuryType || null,
    severity: severity ?? "mild",
    description: description ?? "",
    action_taken: actionTaken || null,
    trainer_referred: Boolean(trainerReferred),
    return_to_play_date: returnToPlayDate || null,
    is_cleared: false,
  }).select("*, member_profiles(full_name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("member_profiles").update({ is_injured: true }).eq("id", memberId);

  return NextResponse.json({ injury: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, isCleared, returnToPlayDate, actionTaken } = await request.json();

  const { data: injury } = await supabase
    .from("sports_injuries")
    .select("org_id, member_id")
    .eq("id", id)
    .single();

  if (!injury) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", injury.org_id)
    .single();

  const role = String(membership?.role ?? "general_member") as RoleName;
  if (!canAccessInjuries(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if (isCleared !== undefined) updates.is_cleared = isCleared;
  if (returnToPlayDate !== undefined) updates.return_to_play_date = returnToPlayDate;
  if (actionTaken !== undefined) updates.action_taken = actionTaken;

  const { data, error } = await supabase
    .from("sports_injuries")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (isCleared) {
    const { count } = await supabase
      .from("sports_injuries")
      .select("id", { count: "exact", head: true })
      .eq("member_id", injury.member_id)
      .eq("is_cleared", false);

    if ((count ?? 0) === 0) {
      await supabase.from("member_profiles").update({ is_injured: false }).eq("id", injury.member_id);
    }
  }

  return NextResponse.json({ injury: data });
}
