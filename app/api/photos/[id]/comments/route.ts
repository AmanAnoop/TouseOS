import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: photoId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: photo } = await supabase.from("photos").select("org_id").eq("id", photoId).single();
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("photo_comments")
    .select("id, author_name, body, created_at")
    .eq("photo_id", photoId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: photoId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { body } = await request.json();
  if (!body?.trim()) return NextResponse.json({ error: "body required" }, { status: 400 });

  const { data: photo } = await supabase.from("photos").select("org_id").eq("id", photoId).single();
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [{ data: member }, { data: profile }] = await Promise.all([
    supabase
      .from("org_members")
      .select("id")
      .eq("org_id", photo.org_id)
      .eq("user_id", user.id)
      .neq("status", "removed")
      .maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);

  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("photo_comments")
    .insert({
      photo_id: photoId,
      org_id: photo.org_id,
      author_id: user.id,
      author_name: profile?.full_name ?? "Member",
      body: body.trim(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
