import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function userInMatch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  matchId: string,
) {
  const { data: match } = await supabase
    .from("greekmatch_matches")
    .select("user_a_id, user_b_id, user_a_unmatched, user_b_unmatched")
    .eq("id", matchId)
    .single();

  if (!match) return { ok: false as const, status: 404, error: "Match not found" };
  if (match.user_a_id !== userId && match.user_b_id !== userId) {
    return { ok: false as const, status: 403, error: "Not in this match" };
  }
  if (match.user_a_unmatched || match.user_b_unmatched) {
    return { ok: false as const, status: 400, error: "Match is no longer active" };
  }
  return { ok: true as const, match };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { matchId } = await params;
  const check = await userInMatch(supabase, user.id, matchId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { data, error } = await supabase
    .from("greekmatch_messages")
    .select("*")
    .eq("match_id", matchId)
    .order("sent_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { matchId } = await params;
  const { body } = await request.json();
  if (!body?.trim()) {
    return NextResponse.json({ error: "body required" }, { status: 400 });
  }

  const check = await userInMatch(supabase, user.id, matchId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { data, error } = await supabase
    .from("greekmatch_messages")
    .insert({
      match_id: matchId,
      sender_id: user.id,
      body: body.trim(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
