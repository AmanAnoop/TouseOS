import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_CHECKLIST = [
  "Agree on post date with partner chapter",
  "Draft shared caption",
  "Collect photos from both chapters",
  "Tag partner account in caption",
  "Officer approval on both sides",
];

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("collab_posts")
    .select("*")
    .eq("org_id", orgId)
    .order("scheduled_date", { ascending: true, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, partnerOrgName, title, captionDraft, scheduledDate } = await request.json();
  if (!orgId || !partnerOrgName || !title) {
    return NextResponse.json({ error: "orgId, partnerOrgName, and title required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("collab_posts")
    .insert({
      org_id: orgId,
      partner_org_name: partnerOrgName,
      title,
      caption_draft: captionDraft ?? null,
      scheduled_date: scheduledDate || null,
      checklist: DEFAULT_CHECKLIST.map((item) => ({ item, done: false })),
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, orgId, status, captionDraft, scheduledDate, checklist } = await request.json();
  if (!id || !orgId) return NextResponse.json({ error: "id and orgId required" }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status !== undefined) updates.status = status;
  if (captionDraft !== undefined) updates.caption_draft = captionDraft;
  if (scheduledDate !== undefined) updates.scheduled_date = scheduledDate;
  if (checklist !== undefined) updates.checklist = checklist;

  const { data, error } = await supabase
    .from("collab_posts")
    .update(updates)
    .eq("id", id)
    .eq("org_id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
