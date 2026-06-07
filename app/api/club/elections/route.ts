import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";
import { getProductId } from "@/lib/org-product";

export async function GET(request: Request) {
  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: m } = await supabase
    .from("org_members")
    .select("organizations(type)")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .single();

  if (!m || getProductId(String(((m.organizations as unknown) as Record<string, unknown>)?.type ?? "")) !== "club") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: elections, error } = await supabase
    .from("club_elections")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (elections ?? []).map((e) => e.id);
  let candidates: Array<Record<string, unknown>> = [];
  let votes: Array<{ election_id: string; candidate_id: string }> = [];

  if (ids.length > 0) {
    const [cRes, vRes] = await Promise.all([
      supabase.from("club_election_candidates").select("*").in("election_id", ids),
      supabase.from("club_election_votes").select("election_id, candidate_id").in("election_id", ids),
    ]);
    candidates = cRes.data ?? [];
    votes = vRes.data ?? [];
  }

  const voteCounts = new Map<string, number>();
  for (const v of votes) {
    voteCounts.set(v.candidate_id, (voteCounts.get(v.candidate_id) ?? 0) + 1);
  }

  const enriched = (elections ?? []).map((e) => ({
    ...e,
    candidates: candidates
      .filter((c) => c.election_id === e.id)
      .map((c) => ({ ...c, votes: voteCounts.get(String(c.id)) ?? 0 })),
    myVote: votes.find((v) => v.election_id === e.id && false) ?? null,
  }));

  const { data: myVotes } = await supabase
    .from("club_election_votes")
    .select("election_id, candidate_id")
    .eq("voter_user_id", user.id)
    .in("election_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

  return NextResponse.json({
    elections: enriched.map((e) => ({
      ...e,
      myVoteCandidateId: myVotes?.find((v) => v.election_id === e.id)?.candidate_id ?? null,
    })),
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { orgId, title, position, description, status } = body;

  const { data: m } = await supabase
    .from("org_members")
    .select("role, organizations(type)")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .single();

  const role = String(m?.role ?? "general_member") as RoleName;
  if (getProductId(String(((m?.organizations as unknown) as Record<string, unknown>)?.type ?? "")) !== "club" || !can(role, "manage_org_settings")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("club_elections")
    .insert({
      org_id: orgId,
      title,
      position,
      description: description || null,
      status: status ?? "open",
      opens_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, id, status } = await request.json();
  if (!orgId || !id || !status) {
    return NextResponse.json({ error: "orgId, id, and status required" }, { status: 400 });
  }

  const { data: m } = await supabase
    .from("org_members")
    .select("role, organizations(type)")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .single();

  const role = String(m?.role ?? "general_member") as RoleName;
  if (getProductId(String(((m?.organizations as unknown) as Record<string, unknown>)?.type ?? "")) !== "club" || !can(role, "manage_org_settings")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates: Record<string, unknown> = { status };
  if (status === "closed") updates.closes_at = new Date().toISOString();
  if (status === "open") updates.opens_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("club_elections")
    .update(updates)
    .eq("id", id)
    .eq("org_id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
