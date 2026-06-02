import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const [announcementsRes, scheduledRes, membersRes] = await Promise.all([
    supabase.from("announcements").select("id, pinned, created_at").eq("org_id", orgId),
    supabase.from("scheduled_messages").select("id, status, channel").eq("org_id", orgId),
    supabase.from("member_profiles").select("id").eq("org_id", orgId).eq("membership_status", "active"),
  ]);

  const announcements = announcementsRes.data ?? [];
  const scheduled = scheduledRes.data ?? [];
  const memberCount = membersRes.data?.length ?? 0;

  const recentAnnouncements = announcements.filter((a) => a.created_at >= thirtyDaysAgo);

  return NextResponse.json({
    memberCount,
    totalAnnouncements: announcements.length,
    announcementsLast30Days: recentAnnouncements.length,
    pinnedCount: announcements.filter((a) => a.pinned).length,
    scheduledPending: scheduled.filter((s) => s.status === "scheduled").length,
    scheduledSent: scheduled.filter((s) => s.status === "sent").length,
    emailChannelCount: scheduled.filter((s) => s.channel === "email").length,
  });
}
