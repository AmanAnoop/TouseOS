import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureRoomMember } from "@/lib/chat-access";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  if (!(await ensureRoomMember(supabase, roomId, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [{ data: room }, { data: members }] = await Promise.all([
    supabase.from("chat_rooms").select("*").eq("id", roomId).eq("org_id", orgId).single(),
    supabase
      .from("chat_room_members")
      .select("user_id, nickname, muted, pinned_to_top, timeout_until, last_read_at, joined_at")
      .eq("room_id", roomId),
  ]);

  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const userIds = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  let displayName = room.name;
  if (room.room_type === "dm" && Array.isArray(room.dm_user_ids)) {
    const otherId = (room.dm_user_ids as string[]).find((id) => id !== user.id);
    const other = otherId ? profileMap.get(otherId) : null;
    if (other?.full_name) displayName = other.full_name;
  }

  return NextResponse.json({
    ...room,
    name: displayName,
    members: (members ?? []).map((m) => ({
      ...m,
      full_name: profileMap.get(m.user_id)?.full_name ?? m.nickname ?? "Member",
      avatar_url: profileMap.get(m.user_id)?.avatar_url ?? null,
    })),
  });
}
