import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dmUserPair } from "@/lib/chat-access";
import { getMemberProfileForUser } from "@/lib/point-access";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, targetUserId } = await request.json();
  if (!orgId || !targetUserId) {
    return NextResponse.json({ error: "orgId and targetUserId required" }, { status: 400 });
  }
  if (targetUserId === user.id) {
    return NextResponse.json({ error: "You cannot message yourself" }, { status: 400 });
  }

  const pair = dmUserPair(user.id, targetUserId);

  const { data: existing } = await supabase
    .from("chat_rooms")
    .select("id")
    .eq("org_id", orgId)
    .eq("room_type", "dm")
    .contains("dm_user_ids", pair)
    .maybeSingle();

  if (existing) return NextResponse.json(existing);

  const [myProfile, { data: theirProfile }] = await Promise.all([
    getMemberProfileForUser(supabase, orgId, user.id),
    supabase.from("profiles").select("full_name").eq("id", targetUserId).maybeSingle(),
  ]);

  const label = theirProfile?.full_name ?? "Direct message";

  const { data: room, error } = await supabase
    .from("chat_rooms")
    .insert({
      org_id: orgId,
      name: label,
      room_type: "dm",
      dm_user_ids: pair,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("chat_room_members").insert([
    { room_id: room.id, org_id: orgId, user_id: user.id, nickname: myProfile?.full_name ?? null },
    { room_id: room.id, org_id: orgId, user_id: targetUserId },
  ]);

  return NextResponse.json(room, { status: 201 });
}
