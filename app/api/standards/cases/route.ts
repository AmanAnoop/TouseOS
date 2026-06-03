import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("standards_cases")
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
    orgId,
    respondentId,
    respondentName,
    caseType,
    description,
    hearingDate,
    notes,
  } = body;

  if (!orgId || !description) {
    return NextResponse.json({ error: "orgId and description required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  const officerRoles = ["owner", "president", "vice_president", "standards_chair", "advisor"];
  if (!membership || !officerRoles.includes(String(membership.role))) {
    return NextResponse.json({ error: "Standards officer access required" }, { status: 403 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: caseRow, error } = await supabase
    .from("standards_cases")
    .insert({
      org_id: orgId,
      respondent_id: respondentId || null,
      respondent_name: respondentName || null,
      case_type: caseType ?? "conduct",
      description,
      hearing_date: hearingDate || null,
      notes: notes || null,
      status: "open",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    actor_name: profile?.full_name ?? user.email,
    action: "standards_case_created",
    resource_type: "standards_cases",
    resource_id: caseRow.id,
    metadata: { case_type: caseType, respondent_id: respondentId ?? null },
  });

  return NextResponse.json(caseRow, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { caseId, orgId, sanctions, restorativeActions, status, notes } = body;

  if (!caseId || !orgId) {
    return NextResponse.json({ error: "caseId and orgId required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  const officerRoles = ["owner", "president", "vice_president", "standards_chair", "advisor"];
  if (!membership || !officerRoles.includes(String(membership.role))) {
    return NextResponse.json({ error: "Standards officer access required" }, { status: 403 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (sanctions !== undefined) updates.sanctions = sanctions;
  if (restorativeActions !== undefined) updates.restorative_actions = restorativeActions;
  if (status !== undefined) {
    updates.status = status;
    if (status === "resolved" || status === "closed") {
      updates.resolved_at = new Date().toISOString();
    }
  }
  if (notes !== undefined) updates.notes = notes;

  const { data: updated, error } = await supabase
    .from("standards_cases")
    .update(updates)
    .eq("id", caseId)
    .eq("org_id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "standards_case_updated",
    resource_type: "standards_cases",
    resource_id: caseId,
    metadata: { fields: Object.keys(updates) },
  });

  return NextResponse.json(updated);
}
