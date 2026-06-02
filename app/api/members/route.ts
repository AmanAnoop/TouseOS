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
    .from("member_profiles")
    .select("*")
    .eq("org_id", orgId)
    .order("full_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { orgId, fullName, email, phone, role, classYear, major, hometown } = body;

  const { data, error } = await supabase.from("member_profiles").insert({
    org_id: orgId,
    full_name: fullName,
    email,
    phone,
    role: role ?? "general_member",
    class_year: classYear,
    major,
    hometown,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log
  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "member_created",
    resource_type: "member_profiles",
    resource_id: data.id,
    metadata: { full_name: fullName, email },
  });

  return NextResponse.json(data, { status: 201 });
}
