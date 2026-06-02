import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { dispatchPushForNotification } from "@/lib/push-notifications";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") ?? "50");

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, markAll } = await request.json();

  if (markAll) {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    return NextResponse.json({ success: true });
  }

  if (id) {
    const { data, error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "id or markAll required" }, { status: 400 });
}

// Create notification (service role only — called server-side)
export async function POST(request: Request) {
  const supabase = await createServiceClient();

  const body = await request.json();
  const { userId, orgId, type, title, body: msgBody, link, sendPush } = body;

  const { data, error } = await supabase.from("notifications").insert({
    user_id: userId,
    org_id: orgId || null,
    type,
    title,
    body: msgBody || null,
    link: link || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (sendPush !== false) {
    await dispatchPushForNotification(supabase, {
      userId,
      title,
      body: msgBody,
      link,
    });
  }

  return NextResponse.json(data, { status: 201 });
}
