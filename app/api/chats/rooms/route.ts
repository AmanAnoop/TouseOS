import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canManageChats } from "@/lib/chat-access";
import { getOrgRole } from "@/lib/point-access";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data: memberships } = await supabase
    .from("chat_room_members")
    .select("room_id, pinned_to_top, muted, last_read_at")
    .eq("org_id", orgId)
    .eq("user_id", user.id);

  const roomIds = (memberships ?? []).map((m) => m.room_id);
  if (!roomIds.length) return NextResponse.json([]);

  const { data: rooms, error } = await supabase
    .from("chat_rooms")
    .select("*")
    .in("id", roomIds)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const enriched = await Promise.all(
    (rooms ?? []).map(async (room) => {
      const memberMeta = memberships?.find((m) => m.room_id === room.id);
      const { data: lastMsg } = await supabase
        .from("chat_messages")
        .select("body, sender_name, created_at")
        .eq("room_id", room.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let unreadQuery = supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("room_id", room.id)
        .neq("sender_id", user.id);

      const lastReadAt = memberMeta?.last_read_at;
      if (lastReadAt) {
        unreadQuery = unreadQuery.gt("created_at", lastReadAt);
      }

      const { count } = await unreadQuery;

      let displayName = room.name;
      if (room.room_type === "dm" && Array.isArray(room.dm_user_ids)) {
        const otherId = (room.dm_user_ids as string[]).find((id) => id !== user.id);
        if (otherId) {
          const { data: otherProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", otherId)
            .maybeSingle();
          if (otherProfile?.full_name) displayName = otherProfile.full_name;
        }
      }

      return {
        ...room,
        name: displayName,
        pinned_to_top: memberMeta?.pinned_to_top ?? false,
        muted: memberMeta?.muted ?? false,
        last_message: lastMsg,
        unread_count: count ?? 0,
      };
    }),
  );

  enriched.sort((a, b) => {
    if (a.pinned_to_top !== b.pinned_to_top) return a.pinned_to_top ? -1 : 1;
    const ta = a.last_message?.created_at ? new Date(a.last_message.created_at).getTime() : 0;
    const tb = b.last_message?.created_at ? new Date(b.last_message.created_at).getTime() : 0;
    return tb - ta;
  });

  return NextResponse.json(enriched);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    orgId, name, description, layout, announcementsOnly,
    memberUserIds, accentColor,
  } = body;

  if (!orgId || !name?.trim()) {
    return NextResponse.json({ error: "orgId and name required" }, { status: 400 });
  }

  const role = await getOrgRole(supabase, orgId, user.id);
  if (!canManageChats(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: room, error } = await supabase
    .from("chat_rooms")
    .insert({
      org_id: orgId,
      name: name.trim(),
      description: description?.trim() || null,
      layout: layout === "wall" ? "wall" : "chat",
      announcements_only: Boolean(announcementsOnly),
      accent_color: accentColor || null,
      created_by: user.id,
      room_type: "group",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const memberIds = new Set<string>([user.id, ...(Array.isArray(memberUserIds) ? memberUserIds : [])]);
  const rows = Array.from(memberIds).map((uid) => ({
    room_id: room.id,
    org_id: orgId,
    user_id: uid,
  }));

  await supabase.from("chat_room_members").insert(rows);

  return NextResponse.json(room, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, roomId, pinnedToTop, muted, ...roomUpdates } = await request.json();
  if (!orgId || !roomId) return NextResponse.json({ error: "orgId and roomId required" }, { status: 400 });

  if (pinnedToTop !== undefined || muted !== undefined) {
    await supabase
      .from("chat_room_members")
      .update({
        ...(pinnedToTop !== undefined ? { pinned_to_top: Boolean(pinnedToTop) } : {}),
        ...(muted !== undefined ? { muted: Boolean(muted) } : {}),
      })
      .eq("room_id", roomId)
      .eq("user_id", user.id);
  }

  const role = await getOrgRole(supabase, orgId, user.id);
  if (canManageChats(role) && Object.keys(roomUpdates).length > 0) {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (roomUpdates.name !== undefined) updates.name = String(roomUpdates.name).trim();
    if (roomUpdates.description !== undefined) updates.description = roomUpdates.description?.trim() || null;
    if (roomUpdates.layout !== undefined) updates.layout = roomUpdates.layout === "wall" ? "wall" : "chat";
    if (roomUpdates.announcementsOnly !== undefined) updates.announcements_only = Boolean(roomUpdates.announcementsOnly);
    if (roomUpdates.screenshotAlerts !== undefined) updates.screenshot_alerts = Boolean(roomUpdates.screenshotAlerts);
    if (roomUpdates.screenshotsDisabled !== undefined) updates.screenshots_disabled = Boolean(roomUpdates.screenshotsDisabled);

    await supabase.from("chat_rooms").update(updates).eq("id", roomId).eq("org_id", orgId);
  }

  const { data } = await supabase.from("chat_rooms").select("*").eq("id", roomId).single();
  return NextResponse.json(data);
}
