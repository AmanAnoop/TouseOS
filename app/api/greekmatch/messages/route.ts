import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const matchId = new URL(request.url).searchParams.get("match_id");
  if (!matchId) return NextResponse.json({ error: "match_id required" }, { status: 400 });

  const { data: match } = await supabase
    .from("greekmatch_matches")
    .select("user_a_id, user_b_id")
    .eq("id", matchId)
    .single();

  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (match.user_a_id !== user.id && match.user_b_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("greekmatch_messages")
    .select("*")
    .eq("match_id", matchId)
    .order("sent_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
