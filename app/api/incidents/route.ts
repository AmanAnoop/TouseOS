import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("incident_reports")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    orgId,
    description,
    incidentDate,
    severity = "medium",
    isAnonymous = false,
    involvedParties,
    eventId,
    reportType = "general",
  } = body;

  if (!orgId || !description?.trim()) {
    return NextResponse.json({ error: "orgId and description required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const status = reportType === "standards_referral" ? "referred" : "open";

  const { data, error } = await supabase
    .from("incident_reports")
    .insert({
      org_id: orgId,
      event_id: eventId || null,
      reported_by: isAnonymous ? null : user.id,
      is_anonymous: Boolean(isAnonymous),
      incident_date: incidentDate || new Date().toISOString(),
      description: `[${reportType}] ${description.trim()}`,
      involved_parties: involvedParties || null,
      severity,
      status,
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

  const { id, status, resolution, advisorEscalated } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status) updates.status = status;
  if (resolution !== undefined) updates.resolution = resolution;
  if (advisorEscalated !== undefined) updates.advisor_escalated = advisorEscalated;

  const { data, error } = await supabase
    .from("incident_reports")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
