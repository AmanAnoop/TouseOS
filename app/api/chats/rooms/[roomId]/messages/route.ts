import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canManageChats, canPostInRoom, ensureRoomMember } from "@/lib/chat-access";
import { getOrgRole } from "@/lib/point-access";
import { createNotification } from "@/lib/notifications";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase();
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  if (!(await ensureRoomMember(supabase, roomId, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: messages, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true })
    .limit(1000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (messages ?? []).map((m) => m.id);
  const [{ data: reactions }, { data: reads }] = await Promise.all([
    ids.length
      ? supabase.from("chat_message_reactions").select("message_id, user_id, emoji").in("message_id", ids)
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabase.from("chat_message_reads").select("message_id, user_id, read_at").in("message_id", ids)
      : Promise.resolve({ data: [] }),
  ]);

  const reactionMap = new Map<string, Array<{ emoji: string; user_id: string }>>();
  for (const r of reactions ?? []) {
    const list = reactionMap.get(r.message_id) ?? [];
    list.push({ emoji: r.emoji, user_id: r.user_id });
    reactionMap.set(r.message_id, list);
  }

  const readMap = new Map<string, string[]>();
  for (const r of reads ?? []) {
    const list = readMap.get(r.message_id) ?? [];
    list.push(r.user_id);
    readMap.set(r.message_id, list);
  }

  let result = (messages ?? []).map((m) => ({
    ...m,
    reactions: reactionMap.get(m.id) ?? [],
    read_by: readMap.get(m.id) ?? [],
  }));

  if (q) {
    result = result.filter((m) => m.body.toLowerCase().includes(q));
  }

  await supabase
    .from("chat_room_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("room_id", roomId)
    .eq("user_id", user.id);

  return NextResponse.json(result);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, body, parentId } = await request.json();
  if (!orgId || !body?.trim()) {
    return NextResponse.json({ error: "orgId and body required" }, { status: 400 });
  }

  const { data: room } = await supabase
    .from("chat_rooms")
    .select("announcements_only, layout, name")
    .eq("id", roomId)
    .eq("org_id", orgId)
    .single();

  if (!room) return NextResponse.json({ error: "Chat not found" }, { status: 404 });

  const role = await getOrgRole(supabase, orgId, user.id);
  if (!(await ensureRoomMember(supabase, roomId, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isReply = Boolean(parentId);
  if (!canPostInRoom({ role, announcementsOnly: room.announcements_only, isReply })) {
    return NextResponse.json({
      error: "Only officers can post in this chat right now. You can still reply to threads.",
    }, { status: 403 });
  }

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      room_id: roomId,
      org_id: orgId,
      sender_id: user.id,
      sender_name: profile?.full_name ?? "Member",
      body: body.trim(),
      parent_id: parentId || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("chat_rooms").update({ updated_at: new Date().toISOString() }).eq("id", roomId);

  if (parentId) {
    const { data: parent } = await supabase
      .from("chat_messages")
      .select("sender_id")
      .eq("id", parentId)
      .maybeSingle();
    if (parent?.sender_id && parent.sender_id !== user.id) {
      await createNotification(supabase, {
        userId: parent.sender_id,
        orgId,
        type: "chat_reply",
        title: `Reply in ${room.name}`,
        body: body.trim().slice(0, 120),
        link: `/chats/${roomId}`,
      });
    }
  } else if (room.announcements_only) {
    const { data: members } = await supabase
      .from("chat_room_members")
      .select("user_id")
      .eq("room_id", roomId)
      .neq("user_id", user.id);

    for (const m of members ?? []) {
      await createNotification(supabase, {
        userId: m.user_id,
        orgId,
        type: "chat_announcement",
        title: room.name,
        body: body.trim().slice(0, 120),
        link: `/chats/${roomId}`,
      });
    }
  }

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, clearAll } = await request.json();
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const role = await getOrgRole(supabase, orgId, user.id);
  if (!canManageChats(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (clearAll) {
    await supabase.from("chat_messages").delete().eq("room_id", roomId);
    return NextResponse.json({ cleared: true });
  }

  return NextResponse.json({ error: "clearAll required" }, { status: 400 });
}
