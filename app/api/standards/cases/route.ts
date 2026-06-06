import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { RoleName } from "@/lib/permissions";
import { getMemberRole, forbidUnless } from "@/lib/api-org-role";

const VALID_TRANSITIONS: Record<string, string[]> = {
  open: ["hearing_scheduled", "resolved", "closed"],
  hearing_scheduled: ["resolved", "appealed", "closed"],
  resolved: ["appealed", "closed"],
  appealed: ["resolved", "closed"],
  closed: [],
};

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const role = await getMemberRole(supabase, user.id, orgId);
  const denied = forbidUnless(role, "view_standards");
  if (denied) return denied;

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

  const role = await getMemberRole(supabase, user.id, orgId);
  const denied = forbidUnless(role, "manage_standards");
  if (denied) return denied;

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
  const { caseId, orgId, sanctions, restorativeActions, status, notes, appealNotes } = body;

  if (!caseId || !orgId) {
    return NextResponse.json({ error: "caseId and orgId required" }, { status: 400 });
  }

  const role = await getMemberRole(supabase, user.id, orgId) as RoleName;
  const denied = forbidUnless(role, "manage_standards");
  if (denied) return denied;

  const { data: existing } = await supabase
    .from("standards_cases")
    .select("status")
    .eq("id", caseId)
    .eq("org_id", orgId)
    .single();

  if (!existing) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (sanctions !== undefined) updates.sanctions = sanctions;
  if (restorativeActions !== undefined) updates.restorative_actions = restorativeActions;
  if (notes !== undefined) updates.notes = notes;
  if (appealNotes !== undefined) updates.appeal_notes = appealNotes;

  if (status !== undefined) {
    const from = String(existing.status);
    const to = String(status);
    const allowed = VALID_TRANSITIONS[from] ?? [];
    if (from !== to && !allowed.includes(to)) {
      return NextResponse.json({ error: `Cannot transition from ${from} to ${to}` }, { status: 400 });
    }
    updates.status = to;
    if (to === "resolved" || to === "closed") {
      updates.resolved_at = new Date().toISOString();
    }
    if (to === "appealed") {
      updates.appealed_at = new Date().toISOString();
    }
    if (to === "resolved" && from === "appealed") {
      updates.resolved_at = new Date().toISOString();
    }
  }

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
