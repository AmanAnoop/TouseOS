import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canManageChats } from "@/lib/chat-access";
import { getOrgRole } from "@/lib/point-access";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, userId, timeoutUntil, addMemberIds } = await request.json();
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const role = await getOrgRole(supabase, orgId, user.id);
  if (!canManageChats(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (userId && timeoutUntil !== undefined) {
    const { error } = await supabase
      .from("chat_room_members")
      .update({
        timeout_until: timeoutUntil === null || timeoutUntil === ""
          ? null
          : new Date(timeoutUntil).toISOString(),
      })
      .eq("room_id", roomId)
      .eq("user_id", userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ updated: true });
  }

  if (Array.isArray(addMemberIds) && addMemberIds.length > 0) {
    const rows = addMemberIds.map((uid: string) => ({
      room_id: roomId,
      org_id: orgId,
      user_id: uid,
    }));
    const { error } = await supabase.from("chat_room_members").upsert(rows, {
      onConflict: "room_id,user_id",
      ignoreDuplicates: true,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ added: addMemberIds.length });
  }

  return NextResponse.json({ error: "No valid update" }, { status: 400 });
}
