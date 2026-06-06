import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data, error } = await supabase.from("social_assets").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, title, assetType, content, fileUrl } = await request.json();
  if (!orgId || !title) return NextResponse.json({ error: "orgId and title required" }, { status: 400 });

  const { data, error } = await supabase.from("social_assets").insert({
    org_id: orgId,
    title,
    asset_type: assetType ?? "template",
    content: content ?? null,
    file_url: fileUrl ?? null,
    created_by: user.id,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!id || !orgId) return NextResponse.json({ error: "id and org_id required" }, { status: 400 });

  const { data: row } = await supabase.from("social_assets").select("org_id").eq("id", id).single();
  if (!row || row.org_id !== orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await supabase.from("social_assets").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
