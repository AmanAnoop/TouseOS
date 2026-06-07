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

function canManageTryouts(role: RoleName): boolean {
  return can(role, "edit_roster") || ["captain", "co_captain", "coach", "owner", "president"].includes(role);
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("sports_tryouts")
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
  const {
    orgId, candidateName, candidateEmail, candidatePhone, position,
    experienceLevel, availability, priorTeams, tryoutDate,
  } = body;
  if (!orgId || !candidateName) {
    return NextResponse.json({ error: "orgId and candidateName required" }, { status: 400 });
  }

  const role = await roleForOrg(supabase, user.id, orgId);
  if (!canManageTryouts(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase.from("sports_tryouts").insert({
    org_id: orgId,
    candidate_name: candidateName,
    candidate_email: candidateEmail || null,
    candidate_phone: candidatePhone || null,
    position: position || null,
    experience_level: experienceLevel ?? "intermediate",
    availability: availability || null,
    prior_teams: priorTeams || null,
    tryout_date: tryoutDate || null,
    status: "registered",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, orgId, status, evalScores, evalNotes } = body;
  if (!id || !orgId) return NextResponse.json({ error: "id and orgId required" }, { status: 400 });

  const role = await roleForOrg(supabase, user.id, orgId);
  if (!canManageTryouts(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (evalScores && typeof evalScores === "object") {
    Object.assign(updates, evalScores);
    const vals = Object.values(evalScores as Record<string, number>).filter((v) => typeof v === "number");
    if (vals.length > 0) {
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      updates.overall_score = Math.round(avg * 10) / 10;
      updates.status = updates.status ?? "attended";
    }
  }
  if (evalNotes !== undefined) updates.notes = evalNotes || null;

  const { data, error } = await supabase
    .from("sports_tryouts")
    .update(updates)
    .eq("id", id)
    .eq("org_id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
