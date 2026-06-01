import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeStandings } from "@/lib/sports-standings";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("sports_game_results")
    .select("*")
    .eq("org_id", orgId)
    .order("played_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const games = (data ?? []) as Array<{
    id: string;
    opponent: string;
    played_at: string;
    score_us: number;
    score_them: number;
    result: "win" | "loss" | "tie";
    location: string | null;
  }>;

  return NextResponse.json({ standings: computeStandings(games), games });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { orgId, opponent, scoreUs, scoreThem, playedAt, eventId, location, notes } = body;

  if (!orgId || !opponent) {
    return NextResponse.json({ error: "orgId and opponent required" }, { status: 400 });
  }

  const { data, error } = await supabase.from("sports_game_results").insert({
    org_id: orgId,
    opponent,
    score_us: scoreUs ?? 0,
    score_them: scoreThem ?? 0,
    played_at: playedAt ?? new Date().toISOString().split("T")[0],
    event_id: eventId ?? null,
    location: location ?? null,
    notes: notes ?? null,
    created_by: user.id,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase.from("sports_game_results").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
