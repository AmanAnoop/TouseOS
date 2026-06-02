import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("interchapter_availability")
    .select("*")
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { orgId, availableDates, notes, memberName } = body;

  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const { data, error } = await supabase
    .from("interchapter_availability")
    .upsert({
      org_id: orgId,
      user_id: user.id,
      member_name: memberName ?? null,
      available_dates: availableDates ?? [],
      notes: notes ?? null,
      semester: "current",
      updated_at: new Date().toISOString(),
    }, { onConflict: "org_id,user_id,semester" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
