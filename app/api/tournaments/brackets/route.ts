import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildBracket, type BracketType } from "@/lib/tournament-bracket";

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

  const type = (bracketType ?? "single_elimination") as BracketType;
  const rounds = buildBracket(type, teams as string[]);

  const { data, error } = await supabase.from("tournament_brackets").insert({
    org_id: orgId,
    event_id: eventId || null,
    title,
    bracket_data: { type, teams, rounds },
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
