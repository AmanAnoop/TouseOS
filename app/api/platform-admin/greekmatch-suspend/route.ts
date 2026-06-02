import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isPlatformAdminEmail } from "@/lib/platform-admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !isPlatformAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, reportId, suspend } = await request.json();
  if (!userId || typeof suspend !== "boolean") {
    return NextResponse.json({ error: "userId and suspend (boolean) required" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: profile, error: profileError } = await service
    .from("greekmatch_profiles")
    .update({
      paused: suspend,
      is_active: !suspend,
    })
    .eq("user_id", userId)
    .select("id, display_name, user_id, paused, is_active")
    .maybeSingle();

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
  if (!profile) return NextResponse.json({ error: "GreekMatch profile not found" }, { status: 404 });

  if (reportId) {
    const { data: row } = await service
      .from("audit_logs")
      .select("metadata, org_id")
      .eq("id", reportId)
      .eq("action", "greekmatch_report")
      .single();

    if (row) {
      const metadata = {
        ...(row.metadata as object ?? {}),
        status: suspend ? "reviewed" : "open",
        suspended: suspend,
        suspended_at: suspend ? new Date().toISOString() : null,
      };
      await service.from("audit_logs").update({ metadata }).eq("id", reportId);
    }

    if (row?.org_id) {
      await service.from("audit_logs").insert({
        org_id: row.org_id,
        actor_id: user.id,
        action: suspend ? "greekmatch_profile_suspended" : "greekmatch_profile_unsuspended",
        resource_type: "greekmatch_profiles",
        resource_id: userId,
        metadata: { report_id: reportId, display_name: profile.display_name },
      });
    }
  }

  return NextResponse.json({ profile, suspended: suspend });
}
