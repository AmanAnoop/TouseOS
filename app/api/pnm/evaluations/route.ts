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

  const role = await roleForOrg(supabase, user.id, orgId);
  if (!can(role, "view_recruitment") && !can(role, "manage_recruitment")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: leads } = await supabase.from("pnm_leads").select("id").eq("org_id", orgId);
  const pnmIds = (leads ?? []).map((l) => l.id);
  if (pnmIds.length === 0) return NextResponse.json([]);

  const { data, error } = await supabase
    .from("pnm_evaluations")
    .select("*")
    .in("pnm_id", pnmIds)
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
  const { orgId, pnmId, scores, comments, anonymous } = body as {
    orgId: string;
    pnmId: string;
    scores: Record<string, number>;
    comments?: string;
    anonymous?: boolean;
  };

  if (!orgId || !pnmId) {
    return NextResponse.json({ error: "orgId and pnmId required" }, { status: 400 });
  }

  const role = await roleForOrg(supabase, user.id, orgId);
  if (!can(role, "manage_recruitment") && !can(role, "view_recruitment")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: lead } = await supabase
    .from("pnm_leads")
    .select("id")
    .eq("id", pnmId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!lead) return NextResponse.json({ error: "PNM not found" }, { status: 404 });

  let evaluatorName = "Anonymous";
  if (!anonymous) {
    const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
    evaluatorName = String(prof?.full_name ?? "Member");
  }

  const { data, error } = await supabase
    .from("pnm_evaluations")
    .insert({
      pnm_id: pnmId,
      evaluator_id: anonymous ? null : user.id,
      evaluator_name: evaluatorName,
      character: scores.character ?? 3,
      involvement: scores.involvement ?? 3,
      leadership_potential: scores.leadership_potential ?? 3,
      academic_seriousness: scores.academic_seriousness ?? 3,
      mutual_interest: scores.mutual_interest ?? 3,
      social_fit: scores.social_fit ?? 3,
      risk_concern: scores.risk_concern ?? 1,
      comments: comments || null,
      is_anonymous: Boolean(anonymous),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
