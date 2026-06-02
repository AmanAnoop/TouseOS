import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, description, roomId, priority } = await request.json();
  if (!orgId || !description?.trim()) {
    return NextResponse.json({ error: "orgId and description required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("maintenance_requests")
    .insert({
      org_id: orgId,
      room_id: roomId || null,
      submitted_by: user.id,
      description: description.trim(),
      priority: priority ?? "medium",
      status: "open",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
