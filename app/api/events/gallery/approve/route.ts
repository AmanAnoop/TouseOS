import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";
import { createNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, photoIds } = await request.json();
  if (!orgId || !Array.isArray(photoIds) || photoIds.length === 0) {
    return NextResponse.json({ error: "orgId and photoIds required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  const role = String(membership?.role ?? "") as RoleName;
  if (!can(role, "approve_photos") && !can(role, "manage_events")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date().toISOString();
  const { data: before } = await supabase
    .from("photos")
    .select("id, uploaded_by, org_id, caption, status")
    .in("id", photoIds)
    .eq("org_id", orgId);

  const { error } = await supabase
    .from("photos")
    .update({ status: "approved", approved_by: user.id, approved_at: now })
    .in("id", photoIds)
    .eq("org_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  for (const row of before ?? []) {
    if (row.status !== "approved" && row.uploaded_by && row.uploaded_by !== user.id) {
      await createNotification(supabase, {
        userId: String(row.uploaded_by),
        orgId,
        type: "photo_approval",
        title: "Photo approved",
        body: row.caption ? `"${row.caption}" is now in the event album.` : "Your event photo was approved.",
        link: `/events`,
      });
    }
  }

  return NextResponse.json({ approved: photoIds.length });
}
