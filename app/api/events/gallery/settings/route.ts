import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, eventId, requireUploadApproval } = await request.json();
  if (!orgId || !eventId) {
    return NextResponse.json({ error: "orgId and eventId required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  const role = String(membership?.role ?? "") as RoleName;
  if (!can(role, "manage_events")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("photo_albums")
    .update({ require_upload_approval: Boolean(requireUploadApproval) })
    .eq("org_id", orgId)
    .eq("event_id", eventId)
    .select("id, require_upload_approval")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Album not found" }, { status: 404 });

  return NextResponse.json(data);
}
