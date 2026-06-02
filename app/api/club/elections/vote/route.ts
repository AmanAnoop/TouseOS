import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProductId } from "@/lib/org-product";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, electionId, candidateId } = await request.json();
  if (!orgId || !electionId || !candidateId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data: m } = await supabase
    .from("org_members")
    .select("organizations(type)")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .single();

  if (!m || getProductId(String(((m.organizations as unknown) as Record<string, unknown>)?.type ?? "")) !== "club") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: election } = await supabase
    .from("club_elections")
    .select("status")
    .eq("id", electionId)
    .eq("org_id", orgId)
    .single();

  if (!election || election.status !== "open") {
    return NextResponse.json({ error: "Election is not open" }, { status: 400 });
  }

  const { error } = await supabase.from("club_election_votes").upsert({
    election_id: electionId,
    org_id: orgId,
    voter_user_id: user.id,
    candidate_id: candidateId,
  }, { onConflict: "election_id,voter_user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
