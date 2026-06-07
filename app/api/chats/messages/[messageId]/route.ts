import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canManageChats } from "@/lib/chat-access";
import { getOrgRole } from "@/lib/point-access";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const { messageId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: msg } = await supabase
    .from("chat_messages")
    .select("id, org_id, sender_id")
    .eq("id", messageId)
    .single();

  if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const role = await getOrgRole(supabase, msg.org_id, user.id);
  if (msg.sender_id !== user.id && !canManageChats(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase.from("chat_messages").delete().eq("id", messageId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const { messageId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, isPinned, markRead } = await request.json();

  if (markRead) {
    const { data: msg } = await supabase
      .from("chat_messages")
      .select("room_id")
      .eq("id", messageId)
      .single();

    if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await supabase.from("chat_message_reads").upsert(
      { message_id: messageId, user_id: user.id, read_at: new Date().toISOString() },
      { onConflict: "message_id,user_id" },
    );

    return NextResponse.json({ read: true });
  }
  const { data: msg } = await supabase
    .from("chat_messages")
    .select("org_id, sender_id")
    .eq("id", messageId)
    .single();

  if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const role = await getOrgRole(supabase, orgId ?? msg.org_id, user.id);
  if (!canManageChats(role) && msg.sender_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .update({ is_pinned: Boolean(isPinned), updated_at: new Date().toISOString() })
    .eq("id", messageId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
