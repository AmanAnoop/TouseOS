import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("greekmatch_matches")
    .select("*")
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .eq("user_a_unmatched", false)
    .eq("user_b_unmatched", false)
    .order("matched_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { matchId, body: messageBody } = await request.json();
  if (!matchId || !messageBody?.trim()) {
    return NextResponse.json({ error: "matchId and body required" }, { status: 400 });
  }

  // Verify user is in the match
  const { data: match } = await supabase
    .from("greekmatch_matches")
    .select("user_a_id, user_b_id, user_a_unmatched, user_b_unmatched")
    .eq("id", matchId)
    .single();

  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const m = match as Record<string, unknown>;
  if (m.user_a_id !== user.id && m.user_b_id !== user.id) {
    return NextResponse.json({ error: "Not in this match" }, { status: 403 });
  }
  if (m.user_a_unmatched || m.user_b_unmatched) {
    return NextResponse.json({ error: "Match is no longer active" }, { status: 400 });
  }

  const { data, error } = await supabase.from("greekmatch_messages").insert({
    match_id: matchId,
    sender_id: user.id,
    body: messageBody.trim(),
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
