import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("coaching_notes")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, noteType, title, content } = await request.json();
  if (!orgId || !noteType || !content?.trim()) {
    return NextResponse.json({ error: "orgId, noteType, and content required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("coaching_notes")
    .insert({
      org_id: orgId,
      note_type: noteType,
      title: title ?? null,
      content: content.trim(),
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

  const { orgId, memberId, availability } = await request.json();
  if (!orgId || !memberId || !availability) {
    return NextResponse.json({ error: "orgId, memberId, and availability required" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("coaching_notes")
    .select("id")
    .eq("org_id", orgId)
    .eq("note_type", "availability")
    .eq("title", memberId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("coaching_notes")
      .update({ content: availability })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const { data, error } = await supabase
    .from("coaching_notes")
    .insert({
      org_id: orgId,
      note_type: "availability",
      title: memberId,
      content: availability,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
