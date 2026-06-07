import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureRoomMember } from "@/lib/chat-access";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const { messageId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { emoji } = await request.json();
  if (!emoji) return NextResponse.json({ error: "emoji required" }, { status: 400 });

  const { data: msg } = await supabase
    .from("chat_messages")
    .select("room_id")
    .eq("id", messageId)
    .single();

  if (!msg || !(await ensureRoomMember(supabase, msg.room_id, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("chat_message_reactions")
    .upsert(
      { message_id: messageId, user_id: user.id, emoji: String(emoji) },
      { onConflict: "message_id,user_id" },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const { messageId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabase
    .from("chat_message_reactions")
    .delete()
    .eq("message_id", messageId)
    .eq("user_id", user.id);

  return NextResponse.json({ removed: true });
}
