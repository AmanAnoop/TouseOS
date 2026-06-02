import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const OFFICER_ROLES = [
  "owner", "president", "vice_president", "treasurer", "secretary",
  "social_chair", "recruitment_chair", "risk_manager", "advisor", "pr_chair",
];

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, url, storagePath, caption } = await request.json();
  if (!orgId || !url) {
    return NextResponse.json({ error: "orgId and url required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  if (!membership || !OFFICER_ROLES.includes(String(membership.role))) {
    return NextResponse.json({ error: "Officer access required" }, { status: 403 });
  }

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();

  const { data, error } = await supabase
    .from("photos")
    .insert({
      org_id: orgId,
      uploaded_by: user.id,
      uploader_name: profile?.full_name ?? "Officer",
      url,
      storage_path: storagePath ?? null,
      caption: caption ?? null,
      status: "approved",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "feed_photo_posted",
    resource_type: "photos",
    resource_id: data.id,
  });

  return NextResponse.json(data, { status: 201 });
}
