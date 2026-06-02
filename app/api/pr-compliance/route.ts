import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPrComplianceCleared, type PrChecklistState } from "@/lib/pr-compliance";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("pr_compliance_reviews")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(15);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, photoIds, checklist, notes } = await request.json();
  if (!orgId || !checklist) {
    return NextResponse.json({ error: "orgId and checklist required" }, { status: 400 });
  }

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
  const cleared = isPrComplianceCleared(checklist as PrChecklistState);

  const { data, error } = await supabase
    .from("pr_compliance_reviews")
    .insert({
      org_id: orgId,
      photo_ids: photoIds ?? [],
      checklist,
      all_cleared: cleared,
      reviewed_by: user.id,
      reviewer_name: profile?.full_name ?? user.email,
      notes: notes ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: cleared ? "pr_compliance_approved" : "pr_compliance_reviewed",
    resource_type: "pr_compliance_reviews",
    resource_id: data.id,
    metadata: { all_cleared: cleared, photo_count: (photoIds ?? []).length },
  });

  return NextResponse.json(data, { status: 201 });
}
