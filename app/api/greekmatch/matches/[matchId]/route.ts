import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { matchId } = await params;
  const { data: m } = await supabase
    .from("greekmatch_matches")
    .select("user_a_id, user_b_id")
    .eq("id", matchId)
    .single();

  if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (m.user_a_id !== user.id && m.user_b_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isA = m.user_a_id === user.id;
  const { error } = await supabase
    .from("greekmatch_matches")
    .update(isA ? { user_a_unmatched: true } : { user_b_unmatched: true })
    .eq("id", matchId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
