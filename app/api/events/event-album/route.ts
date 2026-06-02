import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  const eventId = searchParams.get("event_id");
  if (!orgId || !eventId) {
    return NextResponse.json({ error: "org_id and event_id required" }, { status: 400 });
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("id", eventId)
    .eq("org_id", orgId)
    .single();

  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const { data: existing } = await supabase
    .from("photo_albums")
    .select("id, title, event_id")
    .eq("org_id", orgId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ album: existing, created: false });
  }

  const { data: created, error } = await supabase
    .from("photo_albums")
    .insert({
      org_id: orgId,
      event_id: eventId,
      title: `${event.title} — Photos`,
      allow_member_upload: true,
    })
    .select("id, title, event_id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ album: created, created: true }, { status: 201 });
}
