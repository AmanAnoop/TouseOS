import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canManagePoints, getOrgRole } from "@/lib/point-access";
import { createNotification } from "@/lib/notifications";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, action, denialReason } = await request.json();
  if (!orgId || !action) {
    return NextResponse.json({ error: "orgId and action required" }, { status: 400 });
  }

  const role = await getOrgRole(supabase, orgId, user.id);
  if (!canManagePoints(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: reqRow } = await supabase
    .from("point_requests")
    .select("*, member_profiles(user_id, full_name)")
    .eq("id", id)
    .eq("org_id", orgId)
    .single();

  if (!reqRow) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (reqRow.status !== "pending") {
    return NextResponse.json({ error: "This request was already reviewed" }, { status: 400 });
  }

  const memberUserId = (reqRow.member_profiles as { user_id?: string } | null)?.user_id;
  const memberName = (reqRow.member_profiles as { full_name?: string } | null)?.full_name ?? "Member";

  if (action === "deny") {
    const reason = String(denialReason ?? "").trim();
    if (!reason) {
      return NextResponse.json({ error: "Please include a reason when denying a request" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("point_requests")
      .update({
        status: "denied",
        denial_reason: reason,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (memberUserId) {
      await createNotification(supabase, {
        userId: memberUserId,
        orgId,
        type: "points_denied",
        title: "Point request update",
        body: reason,
        link: "/attendance-points",
      });
    }

    return NextResponse.json(data);
  }

  if (action === "approve") {
    const { data: entry, error: entryErr } = await supabase
      .from("member_point_entries")
      .insert({
        org_id: orgId,
        member_id: reqRow.member_id,
        points: reqRow.points_requested,
        reason: reqRow.reason,
        category: reqRow.category,
        entry_type: "earned",
        created_by: user.id,
        opportunity_id: reqRow.opportunity_id,
        request_id: id,
      })
      .select()
      .single();

    if (entryErr) return NextResponse.json({ error: entryErr.message }, { status: 500 });

    const { data, error } = await supabase
      .from("point_requests")
      .update({
        status: "approved",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        point_entry_id: entry.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (memberUserId) {
      await createNotification(supabase, {
        userId: memberUserId,
        orgId,
        type: "points_approved",
        title: "Points approved!",
        body: `+${reqRow.points_requested} points for ${memberName}`,
        link: "/attendance-points",
      });
    }

    return NextResponse.json({ request: data, entry });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
