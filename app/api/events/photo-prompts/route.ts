import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { EVENT_PHOTO_PROMPTS } from "@/lib/event-photo-prompts";
import { createNotification } from "@/lib/notifications";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  const eventId = searchParams.get("event_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  let query = supabase
    .from("event_photo_prompt_batches")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (eventId) query = query.eq("event_id", eventId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, eventId, promptKeys, notifyMembers } = await request.json();
  if (!orgId || !eventId) {
    return NextResponse.json({ error: "orgId and eventId required" }, { status: 400 });
  }

  const keys: string[] = Array.isArray(promptKeys) && promptKeys.length > 0
    ? promptKeys
    : EVENT_PHOTO_PROMPTS.map((p) => p.key);

  const prompts = EVENT_PHOTO_PROMPTS.filter((p) => keys.includes(p.key));

  const { data: event } = await supabase
    .from("events")
    .select("title")
    .eq("id", eventId)
    .eq("org_id", orgId)
    .single();

  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const { data: batch, error } = await supabase
    .from("event_photo_prompt_batches")
    .insert({
      org_id: orgId,
      event_id: eventId,
      prompts,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (notifyMembers) {
    const { data: members } = await supabase
      .from("member_profiles")
      .select("user_id")
      .eq("org_id", orgId)
      .eq("membership_status", "active")
      .not("user_id", "is", null);

    const memberUserIds = [...new Set((members ?? []).map((m) => m.user_id).filter(Boolean))] as string[];

    await Promise.all(
      memberUserIds.slice(0, 200).map((userId) =>
        createNotification(supabase, {
          userId,
          orgId,
          type: "photo_prompt",
          title: "Upload event photos",
          body: `${prompts.length} photo prompts for "${event.title}" — open Touse Social to contribute.`,
          link: `/social`,
          sendPush: false,
        }),
      ),
    );
  }

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "event_photo_prompts_sent",
    resource_type: "events",
    resource_id: eventId,
    metadata: { prompt_count: prompts.length, notify: Boolean(notifyMembers) },
  });

  return NextResponse.json(batch, { status: 201 });
}
