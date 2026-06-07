import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Enriched match list for inbox UI */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  const otherIds = matchRows.map((m) =>
    m.user_a_id === user.id ? String(m.user_b_id) : String(m.user_a_id),
  );

  const { data: profiles } = await supabase
    .from("greekmatch_profiles")
    .select("user_id, display_name, photos, organizations(name)")
    .in("user_id", otherIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => {
      const org = p.organizations as { name?: string } | null;
      return [
        String(p.user_id),
        {
          display_name: p.display_name,
          photos: p.photos,
          org_name: org?.name ?? null,
        },
      ];
    }),
  );

  const matchIds = matchRows.map((m) => m.id);
  const { data: lastMsgs } = await supabase
    .from("greekmatch_messages")
    .select("match_id, body, sent_at, sender_id")
    .in("match_id", matchIds)
    .order("sent_at", { ascending: false });

  const lastByMatch = new Map<string, { body: string; sent_at: string }>();
  for (const msg of lastMsgs ?? []) {
    if (!lastByMatch.has(msg.match_id)) {
      lastByMatch.set(msg.match_id, { body: msg.body, sent_at: msg.sent_at });
    }
  }

  const enriched = matchRows.map((m) => {
    const otherId = m.user_a_id === user.id ? String(m.user_b_id) : String(m.user_a_id);
    const profile = profileMap.get(otherId);
    const last = lastByMatch.get(m.id);
    return {
      id: m.id,
      other_user_id: otherId,
      display_name: profile?.display_name ?? "Match",
      photos: profile?.photos ?? [],
      org_name: profile?.org_name,
      last_message: last?.body ?? null,
      last_message_at: last?.sent_at ?? m.matched_at,
      matched_at: m.matched_at,
    };
  });

  return NextResponse.json(enriched);
}
