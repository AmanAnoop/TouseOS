import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const { data, error } = await supabase
    .from("scheduled_messages")
    .select("*")
    .eq("org_id", orgId)
    .order("scheduled_for", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, channel, title, body, audience, scheduledFor } = await request.json();
  if (!orgId || !body || !scheduledFor) {
    return NextResponse.json({ error: "orgId, body, and scheduledFor required" }, { status: 400 });
  }

  const { data, error } = await supabase.from("scheduled_messages").insert({
    org_id: orgId,
    channel: channel ?? "announcement",
    title: title ?? null,
    body,
    audience: [audience ?? "all"],
    scheduled_for: scheduledFor,
    status: "scheduled",
    created_by: user.id,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: data });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await supabase.from("scheduled_messages").update({ status: "cancelled" }).eq("id", id);
  return NextResponse.json({ success: true });
}
