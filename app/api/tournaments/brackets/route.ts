import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const { data, error } = await supabase
    .from("tournament_brackets")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ brackets: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, eventId, title, teams, bracketType } = await request.json();
  if (!orgId || !title || !teams?.length) {
    return NextResponse.json({ error: "orgId, title, and teams required" }, { status: 400 });
  }

  const rounds = buildSingleEliminationBracket(teams as string[]);

  const { data, error } = await supabase.from("tournament_brackets").insert({
    org_id: orgId,
    event_id: eventId || null,
    title,
    bracket_data: { type: bracketType ?? "single_elimination", teams, rounds },
    status: "active",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bracket: data });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, rounds, status } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (rounds) {
    const { data: existing } = await supabase.from("tournament_brackets").select("bracket_data").eq("id", id).single();
    updates.bracket_data = { ...(existing?.bracket_data as object ?? {}), rounds };
  }
  if (status) updates.status = status;

  const { error } = await supabase.from("tournament_brackets").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

function buildSingleEliminationBracket(teams: string[]) {
  const padded = [...teams];
  while (padded.length & (padded.length - 1)) padded.push("BYE");
  const round1 = [];
  for (let i = 0; i < padded.length; i += 2) {
    round1.push({
      id: `r1-${i / 2}`,
      team1: padded[i],
      team2: padded[i + 1],
      score1: null as number | null,
      score2: null as number | null,
      winner: null as string | null,
    });
  }
  const rounds = [{ name: "Round 1", matches: round1 }];
  let prevCount = round1.length;
  let roundNum = 2;
  while (prevCount > 1) {
    prevCount = Math.ceil(prevCount / 2);
    const matches = Array.from({ length: prevCount }, (_, i) => ({
      id: `r${roundNum}-${i}`,
      team1: "TBD",
      team2: "TBD",
      score1: null as number | null,
      score2: null as number | null,
      winner: null as string | null,
    }));
    rounds.push({ name: prevCount === 1 ? "Final" : `Round ${roundNum}`, matches });
    roundNum++;
  }
  return rounds;
}
