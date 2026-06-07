import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eventId = new URL(request.url).searchParams.get("event_id");
  if (!eventId) return NextResponse.json({ error: "event_id required" }, { status: 400 });

  const { data: event } = await supabase.from("events").select("org_id").eq("id", eventId).single();
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const { data: member } = await supabase
    .from("org_members")
    .select("id")
    .eq("org_id", event.org_id)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("event_comments")
    .select("id, event_id, org_id, author_id, author_name, parent_id, body, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { eventId, body, parentId } = await request.json();
  if (!eventId || !body?.trim()) {
    return NextResponse.json({ error: "eventId and body required" }, { status: 400 });
  }

  const { data: event } = await supabase.from("events").select("org_id").eq("id", eventId).single();
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const [{ data: member }, { data: profile }] = await Promise.all([
    supabase
      .from("org_members")
      .select("id")
      .eq("org_id", event.org_id)
      .eq("user_id", user.id)
      .neq("status", "removed")
      .maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);

  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (parentId) {
    const { data: parent } = await supabase
      .from("event_comments")
      .select("id")
      .eq("id", parentId)
      .eq("event_id", eventId)
      .maybeSingle();
    if (!parent) return NextResponse.json({ error: "Parent comment not found" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("event_comments")
    .insert({
      event_id: eventId,
      org_id: event.org_id,
      author_id: user.id,
      author_name: profile?.full_name ?? "Member",
      parent_id: parentId || null,
      body: body.trim(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
