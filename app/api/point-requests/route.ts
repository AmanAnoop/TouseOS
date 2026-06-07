import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canManagePoints, getMemberProfileForUser, getOrgRole } from "@/lib/point-access";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  const status = searchParams.get("status");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const role = await getOrgRole(supabase, orgId, user.id);
  const isOfficer = canManagePoints(role);

  let query = supabase
    .from("point_requests")
    .select(`
      *,
      member_profiles(full_name, profile_photo_url),
      point_opportunities(name, points, category)
    `)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!isOfficer) {
    const profile = await getMemberProfileForUser(supabase, orgId, user.id);
    if (!profile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    query = query.eq("member_id", profile.id);
  }

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = await Promise.all(
    (data ?? []).map(async (row) => {
      let proofUrl: string | null = null;
      if (row.proof_storage_path) {
        const { data: signed } = await supabase.storage
          .from("photos")
          .createSignedUrl(row.proof_storage_path, 3600);
        proofUrl = signed?.signedUrl ?? null;
      }
      return { ...row, proof_url: proofUrl };
    }),
  );

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { orgId, opportunityId, pointsRequested, category, reason, proofStoragePath } = body;

  if (!orgId || !reason?.trim()) {
    return NextResponse.json({ error: "orgId and reason required" }, { status: 400 });
  }

  const profile = await getMemberProfileForUser(supabase, orgId, user.id);
  if (!profile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let points = parseInt(String(pointsRequested ?? 0), 10);
  let cat = category?.trim() || null;

  if (opportunityId) {
    const { data: opp } = await supabase
      .from("point_opportunities")
      .select("points, category, active")
      .eq("id", opportunityId)
      .eq("org_id", orgId)
      .single();
    if (!opp?.active) {
      return NextResponse.json({ error: "That opportunity is no longer available" }, { status: 400 });
    }
    points = opp.points;
    cat = opp.category ?? cat;
  }

  if (!points || points < 1) {
    return NextResponse.json({ error: "Points amount required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("point_requests")
    .insert({
      org_id: orgId,
      member_id: profile.id,
      opportunity_id: opportunityId || null,
      points_requested: points,
      category: cat,
      reason: reason.trim(),
      proof_storage_path: proofStoragePath || null,
      status: "pending",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
