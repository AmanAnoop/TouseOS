import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, title, body, pinned } = await request.json();
  if (!orgId || !title || !body) {
    return NextResponse.json({ error: "orgId, title, and body required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  const officerRoles = [
    "owner", "president", "vice_president", "treasurer", "secretary",
    "social_chair", "recruitment_chair", "risk_manager", "advisor",
  ];
  if (!membership || !officerRoles.includes(String(membership.role))) {
    return NextResponse.json({ error: "Officer access required" }, { status: 403 });
  }

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();

  const { data, error } = await supabase
    .from("announcements")
    .insert({
      org_id: orgId,
      author_id: user.id,
      author_name: profile?.full_name ?? "Officer",
      title,
      body,
      audience: ["all"],
      pinned: Boolean(pinned),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
