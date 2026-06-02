import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("yearbook_sections")
    .select("*")
    .eq("org_id", orgId)
    .order("order_index")
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, sectionType, title, body, personName, imageUrl, orderIndex } = await request.json();
  if (!orgId || !sectionType || !title) {
    return NextResponse.json({ error: "orgId, sectionType, and title required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("yearbook_sections")
    .insert({
      org_id: orgId,
      section_type: sectionType,
      title,
      body: body ?? null,
      person_name: personName ?? null,
      image_url: imageUrl ?? null,
      order_index: orderIndex ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, orgId } = await request.json();
  if (!id || !orgId) return NextResponse.json({ error: "id and orgId required" }, { status: 400 });

  const { error } = await supabase.from("yearbook_sections").delete().eq("id", id).eq("org_id", orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
