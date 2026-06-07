import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canManageChats } from "@/lib/chat-access";
import { getOrgRole } from "@/lib/point-access";
import { createNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const orgId = String(formData.get("org_id") ?? "");
  const roomId = String(formData.get("room_id") ?? "");
  const preview = formData.get("preview");

  if (!orgId || !roomId) {
    return NextResponse.json({ error: "org_id and room_id required" }, { status: 400 });
  }

  const { data: room } = await supabase
    .from("chat_rooms")
    .select("name, screenshot_alerts")
    .eq("id", roomId)
    .single();

  if (!room?.screenshot_alerts) {
    return NextResponse.json({ ok: true, recorded: false });
  }

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  let previewPath: string | null = null;

  if (preview instanceof Blob && preview.size > 0) {
    const path = `${orgId}/chat-screenshots/${roomId}/${user.id}-${Date.now()}.jpg`;
    const buffer = Buffer.from(await preview.arrayBuffer());
    const { data: stored } = await supabase.storage.from("photos").upload(path, buffer, {
      contentType: "image/jpeg",
      upsert: false,
    });
    previewPath = stored?.path ?? null;
  }

  await supabase.from("chat_screenshot_alerts").insert({
    room_id: roomId,
    org_id: orgId,
    user_id: user.id,
    user_name: profile?.full_name ?? "Member",
    preview_storage_path: previewPath,
  });

  const { data: officers } = await supabase
    .from("org_members")
    .select("user_id, role")
    .eq("org_id", orgId)
    .neq("status", "removed");

  for (const o of officers ?? []) {
    const role = await getOrgRole(supabase, orgId, o.user_id);
    if (canManageChats(role)) {
      await createNotification(supabase, {
        userId: o.user_id,
        orgId,
        type: "chat_screenshot",
        title: "Screenshot in chat",
        body: `${profile?.full_name ?? "Someone"} captured ${room.name}`,
        link: `/chats/${roomId}`,
      });
    }
  }

  return NextResponse.json({ ok: true, recorded: true });
}
