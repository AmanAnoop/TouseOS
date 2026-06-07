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

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("interchapter_proposals")
    .select("*")
    .or(`proposing_org_id.eq.${orgId},target_org_id.eq.${orgId}`)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { orgId, targetOrgId, eventName, eventType, estimatedAttendance, themeIdeas, venueIdeas, budgetEstimate, costSplitProposal, alcohol, riskLevel, philanthropyBeneficiary, proposedDates } = body;

  if (!orgId || !targetOrgId || !eventName) {
    return NextResponse.json({ error: "orgId, targetOrgId, and eventName required" }, { status: 400 });
  }

  const role = await roleForOrg(supabase, user.id, orgId);
  if (!can(role, "manage_events")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("interchapter_proposals")
    .insert({
      proposing_org_id: orgId,
      target_org_id: targetOrgId,
      event_name: eventName,
      event_type: eventType ?? "mixer",
      estimated_attendance: estimatedAttendance != null ? parseInt(String(estimatedAttendance), 10) : null,
      theme_ideas: themeIdeas || null,
      venue_ideas: venueIdeas || null,
      budget_estimate: budgetEstimate != null ? parseFloat(String(budgetEstimate)) : null,
      cost_split_proposal: costSplitProposal || null,
      alcohol: Boolean(alcohol),
      risk_level: riskLevel ?? "low",
      philanthropy_beneficiary: philanthropyBeneficiary || null,
      proposed_dates: proposedDates ?? [],
      status: "pending",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, orgId, status, responseMessage } = await request.json();
  if (!id || !orgId || !status) {
    return NextResponse.json({ error: "id, orgId, and status required" }, { status: 400 });
  }

  const role = await roleForOrg(supabase, user.id, orgId);
  if (!can(role, "manage_events")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: proposal } = await supabase
    .from("interchapter_proposals")
    .select("target_org_id, proposing_org_id")
    .eq("id", id)
    .maybeSingle();

  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (proposal.target_org_id !== orgId && proposal.proposing_org_id !== orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("interchapter_proposals")
    .update({
      status,
      response_message: responseMessage ?? null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
