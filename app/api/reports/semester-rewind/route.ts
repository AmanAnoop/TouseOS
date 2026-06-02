import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const [
    orgRes, paymentsRes, reimbsRes, eventsRes, rsvpsRes, pnmRes,
    tasksRes, budgetsRes, membersRes, photosRes,
  ] = await Promise.all([
    supabase.from("organizations").select("name, type").eq("id", orgId).single(),
    supabase.from("payments").select("amount, paid_amount, status").eq("org_id", orgId),
    supabase.from("reimbursements").select("amount, status").eq("org_id", orgId),
    supabase.from("events").select("id, title, type, starts_at").eq("org_id", orgId).order("starts_at", { ascending: false }).limit(50),
    supabase.from("event_rsvps").select("checked_in, event_id, events(title, starts_at)").eq("checked_in", true),
    supabase.from("pnm_leads").select("status").eq("org_id", orgId),
    supabase.from("tasks").select("status").eq("org_id", orgId),
    supabase.from("budgets").select("*, budget_lines(*)").eq("org_id", orgId),
    supabase.from("member_profiles").select("membership_status, attendance_rate").eq("org_id", orgId),
    supabase.from("photos").select("id").eq("org_id", orgId).eq("status", "approved"),
  ]);

  const org = orgRes.data;
  const payments = paymentsRes.data ?? [];
  const events = eventsRes.data ?? [];
  const totalExpected = payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalCollected = payments.reduce((s, p) => s + Number(p.paid_amount), 0);
  const unpaid = totalExpected - totalCollected;

  const expenseLines = (budgetsRes.data ?? []).flatMap((b: { budget_lines?: Array<{ budgeted: number; actual: number; type: string }> }) => b.budget_lines ?? []).filter((l) => l.type === "expense");
  const totalSpent = expenseLines.reduce((s, l) => s + Number(l.actual), 0);

  const pnmAccepted = (pnmRes.data ?? []).filter((p: { status: string }) => p.status === "accepted").length;
  const pnmTotal = (pnmRes.data ?? []).filter((p: { status: string }) => !["removed"].includes(p.status)).length;

  const tasksDone = (tasksRes.data ?? []).filter((t: { status: string }) => t.status === "done").length;
  const tasksTotal = (tasksRes.data ?? []).length;

  const avgAttendance = (membersRes.data ?? []).length
    ? Math.round((membersRes.data as Array<{ attendance_rate: number }>).reduce((s, m) => s + m.attendance_rate, 0) / (membersRes.data as unknown[]).length)
    : 0;

  const report = {
    orgName: org?.name ?? "Organization",
    orgType: org?.type,
    generatedAt: new Date().toISOString(),
    summary: {
      totalRevenue: totalCollected,
      totalExpenses: totalSpent,
      unpaidBalances: unpaid,
      avgAttendance,
      pnmConversion: pnmTotal > 0 ? Math.round((pnmAccepted / pnmTotal) * 100) : null,
      taskCompletion: tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 100,
      eventsHosted: events.length,
      approvedPhotos: (photosRes.data ?? []).length,
      pendingReimbursements: (reimbsRes.data ?? []).filter((r: { status: string }) => ['submitted','needs_info'].includes(r.status)).length,
      totalCheckIns: (rsvpsRes.data ?? []).length,
    },
    attendanceTrend: avgAttendance >= 75 ? "Strong" : avgAttendance >= 50 ? "Moderate" : "Needs improvement",
    recommendations: [
      unpaid > 0 ? `Collect ${unpaid.toFixed(0)} in outstanding dues before next semester.` : "Dues collection is on track.",
      avgAttendance < 75 ? "Focus on attendance incentives and required event reminders." : "Attendance is healthy.",
      tasksDone < tasksTotal * 0.8 ? "Close open officer tasks before officer transition." : "Officer tasks largely complete.",
      "Review vendor notes and transition binders for incoming officers.",
    ],
    lessonsLearned: "Export this report and add chapter-specific lessons in the Officer Transition binder.",
  };

  return NextResponse.json(report);
}
