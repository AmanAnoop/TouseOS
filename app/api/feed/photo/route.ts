import { NextResponse } from "next/server";
import { isDashboardOfficer } from "@/lib/dashboard-roles";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, url, storagePath, caption } = await request.json();
  if (!orgId || !storagePath) {
    return NextResponse.json({ error: "orgId and storagePath required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  const role = String(membership?.role ?? "");
  if (!membership || !isDashboardOfficer(role)) {
    return NextResponse.json({ error: "Officer access required" }, { status: 403 });
  }

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();

  const { data, error } = await supabase
    .from("photos")
    .insert({
      org_id: orgId,
      uploaded_by: user.id,
      uploader_name: profile?.full_name ?? "Member",
      url: url ?? storagePath,
      storage_path: storagePath,
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
