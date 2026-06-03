import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isClubOrg, isGreekOrg, isSportsOrg } from "@/lib/utils";

/** Lightweight member + finance snapshot for dashboard widgets. */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  const orgType = searchParams.get("org_type") ?? "general_org";
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const [
    membersRes,
    paymentsRes,
    announcementsRes,
    tasksRes,
    pnmRes,
  ] = await Promise.all([
    supabase
      .from("member_profiles")
      .select("id, full_name, membership_status, payment_status, attendance_rate, forms_completed, forms_required, created_at, is_injured")
      .eq("org_id", orgId),
    supabase.from("payments").select("amount, paid_amount, status, due_date").eq("org_id", orgId),
    supabase
      .from("announcements")
      .select("id, title, body, author_name, created_at, pinned")
      .eq("org_id", orgId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("tasks")
      .select("id, title, status, priority, due_date, assignee_name")
      .eq("org_id", orgId)
      .neq("status", "done")
      .neq("status", "cancelled")
      .order("due_date", { ascending: true })
      .limit(8),
    isGreekOrg(orgType)
      ? supabase.from("pnm_leads").select("status").eq("org_id", orgId)
      : Promise.resolve({ data: [] }),
  ]);

  if (membersRes.error) return NextResponse.json({ error: membersRes.error.message }, { status: 500 });

  return NextResponse.json({
    members: membersRes.data ?? [],
    payments: paymentsRes.data ?? [],
    announcements: announcementsRes.data ?? [],
    tasks: tasksRes.data ?? [],
    pnmLeads: pnmRes.data ?? [],
    orgType,
    isSports: isSportsOrg(orgType),
    isClub: isClubOrg(orgType),
    isGreek: isGreekOrg(orgType),
    thirtyDaysAgo,
  });
}
