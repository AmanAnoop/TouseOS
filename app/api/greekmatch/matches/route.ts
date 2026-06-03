import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: matchRows, error } = await supabase
    .from("greekmatch_matches")
    .select("*")
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .eq("user_a_unmatched", false)
    .eq("user_b_unmatched", false)
    .order("matched_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!matchRows?.length) return NextResponse.json([]);

  const otherIds = matchRows.map((m: Record<string, unknown>) =>
    m.user_a_id === user.id ? String(m.user_b_id) : String(m.user_a_id),
  );

  const { data: profiles } = await supabase
    .from("greekmatch_profiles")
    .select("user_id, display_name, photos, organizations(name)")
    .in("user_id", otherIds);

  const profileMap = new Map((profiles ?? []).map((p: Record<string, unknown>) => [String(p.user_id), p]));

  const matchIds = matchRows.map((m: Record<string, unknown>) => String(m.id));
  const { data: recentMsgs } = await supabase
    .from("greekmatch_messages")
    .select("match_id, body, sent_at, sender_id")
    .in("match_id", matchIds)
    .order("sent_at", { ascending: false });

  const lastByMatch = new Map<string, { body: string; sent_at: string; sender_id: string }>();
  for (const msg of recentMsgs ?? []) {
    const mid = String((msg as { match_id: string }).match_id);
    if (!lastByMatch.has(mid)) {
      lastByMatch.set(mid, {
        body: String((msg as { body: string }).body),
        sent_at: String((msg as { sent_at: string }).sent_at),
        sender_id: String((msg as { sender_id: string }).sender_id),
      });
    }
  }

  const enriched = matchRows.map((m: Record<string, unknown>) => {
    const otherId = m.user_a_id === user.id ? String(m.user_b_id) : String(m.user_a_id);
    const profile = profileMap.get(otherId);
    const last = lastByMatch.get(String(m.id));
    return {
      id: String(m.id),
      other_user_id: otherId,
      display_name: String(profile?.display_name ?? "Match"),
      photos: (profile?.photos as string[]) ?? [],
      org_name: String((profile?.organizations as Record<string, unknown>)?.name ?? ""),
      last_message: last?.body ?? null,
      last_message_at: last?.sent_at ?? String(m.matched_at),
      unread: last ? last.sender_id !== user.id : false,
      matched_at: m.matched_at,
    };
  });

  return NextResponse.json(enriched);
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { matchId, unmatched } = await request.json();
  if (!matchId || !unmatched) {
    return NextResponse.json({ error: "matchId and unmatched required" }, { status: 400 });
  }

  const { data: match } = await supabase
    .from("greekmatch_matches")
    .select("user_a_id, user_b_id")
    .eq("id", matchId)
    .single();

  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const updates =
    match.user_a_id === user.id
      ? { user_a_unmatched: true }
      : match.user_b_id === user.id
        ? { user_b_unmatched: true }
        : null;

  if (!updates) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabase.from("greekmatch_matches").update(updates).eq("id", matchId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { matchId, body: messageBody } = await request.json();
  if (!matchId || !messageBody?.trim()) {
    return NextResponse.json({ error: "matchId and body required" }, { status: 400 });
  }

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
