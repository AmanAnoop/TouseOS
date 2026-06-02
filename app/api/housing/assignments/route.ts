import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roomId, memberId, moveIn, depositPaid } = await request.json();
  if (!roomId || !memberId) {
    return NextResponse.json({ error: "roomId and memberId required" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("housing_assignments")
    .select("id")
    .eq("room_id", roomId)
    .eq("member_id", memberId)
    .is("move_out", null)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Member already assigned to this room" }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("housing_assignments")
    .insert({
      room_id: roomId,
      member_id: memberId,
      move_in: moveIn || new Date().toISOString().slice(0, 10),
      deposit_paid: depositPaid ?? false,
    })
    .select("*, member_profiles(full_name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase
    .from("housing_assignments")
    .update({ move_out: new Date().toISOString().slice(0, 10) })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
