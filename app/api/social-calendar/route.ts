import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";

async function roleForOrg(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  orgId: string,
): Promise<RoleName> {
  const { data } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .neq("status", "removed")
    .maybeSingle();
  return String(data?.role ?? "general_member") as RoleName;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const [{ data, error }, { data: collabs }] = await Promise.all([
    supabase
      .from("social_calendar")
      .select("*")
      .eq("org_id", orgId)
      .order("scheduled_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("collab_posts")
      .select("id, title, caption_draft, scheduled_date, status, partner_org_name, photo_ids")
      .eq("org_id", orgId)
      .not("scheduled_date", "is", null)
      .order("scheduled_date", { ascending: true }),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const calendarRows = (data ?? []).map((row) => ({ ...row, source: "calendar" as const }));
  const collabRows = (collabs ?? [])
    .filter((c) => !calendarRows.some((r) => r.title === c.title && r.scheduled_date === c.scheduled_date))
    .map((c) => ({
      id: `collab-${c.id}`,
      org_id: orgId,
      title: `${c.title} (collab · ${c.partner_org_name})`,
      caption: c.caption_draft,
      scheduled_date: c.scheduled_date,
      post_type: "carousel",
      status: c.status === "posted" ? "posted" : "draft",
      photo_ids: c.photo_ids ?? [],
      source: "collab" as const,
      collab_id: c.id,
    }));

  return NextResponse.json([...calendarRows, ...collabRows].sort((a, b) => {
    const da = a.scheduled_date ? new Date(String(a.scheduled_date)).getTime() : 0;
    const db = b.scheduled_date ? new Date(String(b.scheduled_date)).getTime() : 0;
    return da - db;
  }));
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { orgId, title, caption, scheduledDate, postType, status, photoIds } = body;
  if (!orgId || !title) {
    return NextResponse.json({ error: "orgId and title required" }, { status: 400 });
  }

  const role = await roleForOrg(supabase, user.id, orgId);
  if (!can(role, "manage_events") && !can(role, "edit_roster") && !["social_chair", "owner", "president"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase.from("social_calendar").insert({
    org_id: orgId,
    title,
    caption: caption || null,
    scheduled_date: scheduledDate || null,
    post_type: postType ?? "feed",
    status: status ?? "draft",
    platform: ["instagram"],
    photo_ids: Array.isArray(photoIds) ? photoIds : [],
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, orgId, status, scheduledDate, photoIds } = await request.json();
  if (!id || !orgId) {
    return NextResponse.json({ error: "id and orgId required" }, { status: 400 });
  }
  if (!status && scheduledDate === undefined && photoIds === undefined) {
    return NextResponse.json({ error: "status, scheduledDate, or photoIds required" }, { status: 400 });
  }

  const role = await roleForOrg(supabase, user.id, orgId);
  if (!can(role, "manage_events") && !can(role, "edit_roster") && !["social_chair", "owner", "president"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if (status !== undefined) updates.status = status;
  if (scheduledDate !== undefined) updates.scheduled_date = scheduledDate || null;
  if (photoIds !== undefined) updates.photo_ids = Array.isArray(photoIds) ? photoIds : [];

  const { data, error } = await supabase
    .from("social_calendar")
    .update(updates)
    .eq("id", id)
    .eq("org_id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
