import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  StatCard, Card, CardHeader, Badge, ProgressBar,
  EmptyState, Alert,
} from "@/components/ui";
import {
  formatCurrency, formatDateTime, isGreekOrg, isSportsOrg,
} from "@/lib/utils";
import { computeHealthScore } from "@/lib/health-score";
import { HealthScoreBadge } from "@/components/dashboard/health-score-badge";
import {
  AlertTriangle, Calendar, CheckCircle2, DollarSign, FileText,
  Heart, Image, Shield, TrendingUp, Trophy, Users, Zap,
} from "lucide-react";
import type { Event, MemberProfile, Payment, Announcement, Task } from "@/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id, role, organizations(*)")
    .eq("user_id", user.id)
    .neq("status", "removed")
    .order("joined_at", { ascending: true })
    .limit(1)
    .single();

  if (!membership) redirect("/onboarding");

  const orgId = membership.org_id;
  const org = membership.organizations as unknown as Record<string, unknown>;
  const orgType = String(org.type ?? "general_org");
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const [
    membersRes, eventsRes, paymentsRes, announcementsRes, tasksRes,
    reimbsRes, budgetsRes, photosRes, pnmRes,
    tripsRes, waiversRes, allEventsRes,
  ] = await Promise.all([
    supabase.from("member_profiles").select("id, full_name, membership_status, payment_status, attendance_rate, forms_completed, forms_required, created_at, is_injured").eq("org_id", orgId),
    supabase.from("events").select("id, title, type, starts_at, location, status").eq("org_id", orgId).gte("starts_at", new Date().toISOString()).order("starts_at").limit(5),
    supabase.from("payments").select("amount, paid_amount, status, due_date").eq("org_id", orgId),
    supabase.from("announcements").select("id, title, body, author_name, created_at, pinned").eq("org_id", orgId).order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(5),
    supabase.from("tasks").select("id, title, status, priority, due_date, assignee_name").eq("org_id", orgId).neq("status", "done").neq("status", "cancelled").order("due_date", { ascending: true }).limit(8),
    supabase.from("reimbursements").select("id, amount, status, created_at").eq("org_id", orgId),
    supabase.from("budgets").select("*, budget_lines(*)").eq("org_id", orgId).order("created_at", { ascending: false }).limit(1),
    supabase.from("photos").select("id, url, caption, uploader_name, created_at, status").eq("org_id", orgId).order("created_at", { ascending: false }).limit(4),
    supabase.from("pnm_leads").select("status").eq("org_id", orgId),
    isSportsOrg(orgType)
      ? supabase.from("sports_travel_trips").select("id, title, status").eq("org_id", orgId).limit(3)
      : Promise.resolve({ data: [] }),
    isSportsOrg(orgType)
      ? supabase.from("sports_waivers").select("status").eq("org_id", orgId)
      : Promise.resolve({ data: [] }),
    supabase.from("events").select("id").eq("org_id", orgId),
  ]);

  const members = (membersRes.data ?? []) as MemberProfile[];
  const events = (eventsRes.data ?? []) as Event[];
  const payments = (paymentsRes.data ?? []) as Payment[];
  const announcements = (announcementsRes.data ?? []) as Announcement[];
  const tasks = (tasksRes.data ?? []) as Task[];
  const reimbs = (reimbsRes.data ?? []) as Array<{ id: string; amount: number; status: string; created_at: string }>;
  const budgets = (budgetsRes.data ?? []) as Array<{ budget_lines?: Array<{ budgeted: number; actual: number; type: string }> }>;
  const photos = (photosRes.data ?? []) as Array<Record<string, unknown>>;
  const pnmLeads = (pnmRes.data ?? []) as Array<{ status: string }>;
  const waivers = (waiversRes.data ?? []) as Array<{ status: string }>;
  const allEventIds = ((allEventsRes.data ?? []) as Array<{ id: string }>).map((e) => e.id);
  let rsvps: Array<{ checked_in: boolean; event_id: string }> = [];
  if (allEventIds.length > 0) {
    const { data: rsvpData } = await supabase.from("event_rsvps").select("checked_in, event_id").in("event_id", allEventIds);
    rsvps = (rsvpData ?? []) as typeof rsvps;
  }

  const activeCount = members.filter((m) => m.membership_status === "active").length;
  const newMembers = members.filter((m) =>
    m.membership_status === "new_member" ||
    (m.created_at && new Date(m.created_at) > new Date(thirtyDaysAgo)),
  ).length;
  const alumniCount = members.filter((m) => m.membership_status === "alumni").length;

  const totalExpected = payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalCollected = payments.reduce((s, p) => s + Number(p.paid_amount), 0);
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
  const overdueCount = payments.filter((p) => p.status === "overdue").length;
  const unpaidMembers = members.filter((m) => m.payment_status !== "current").length;

  const pendingReimbs = reimbs.filter((r) => ["submitted", "needs_info"].includes(r.status));
  const pendingReimbAmount = pendingReimbs.reduce((s, r) => s + Number(r.amount), 0);

  const budgetLines = budgets[0]?.budget_lines ?? [];
  const expenseLines = budgetLines.filter((l) => l.type === "expense");
  const budgetUsed = expenseLines.reduce((s, l) => s + Number(l.actual), 0);
  const budgetTotal = expenseLines.reduce((s, l) => s + Number(l.budgeted), 0);
  const budgetPct = budgetTotal > 0 ? Math.round((budgetUsed / budgetTotal) * 100) : 0;

  const formsIncomplete = members.filter(
    (m) => m.forms_required > 0 && m.forms_completed < m.forms_required,
  ).length;

  const avgAttendance = members.length > 0
    ? Math.round(members.reduce((s, m) => s + m.attendance_rate, 0) / members.length)
    : 0;

  const { breakdown, composite } = computeHealthScore({
    members: members.map((m) => ({
      membership_status: m.membership_status,
      payment_status: m.payment_status,
      attendance_rate: m.attendance_rate,
      forms_completed: m.forms_completed,
      forms_required: m.forms_required,
    })),
    payments: payments.map((p) => ({ amount: p.amount, paid_amount: p.paid_amount, status: p.status })),
    pnmLeads,
    events: events.map((e) => ({ id: e.id })),
    rsvps,
    tasks: tasks.map((t) => ({ status: t.status })),
    reimbursements: reimbs,
    budgets,
    waivers: isSportsOrg(orgType) ? waivers : undefined,
    orgType,
  });

  const tasksDue = tasks.filter(
    (t) => t.due_date && new Date(t.due_date) <= new Date(Date.now() + 3 * 86400000),
  ).length;

  const complianceIssues = formsIncomplete + overdueCount + pendingReimbs.length;
  const complianceOk = complianceIssues === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{String(org.name)}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isGreekOrg(orgType) ? "TouseGreek" : isSportsOrg(orgType) ? "SportsOS" : "Organization"} workspace
          </p>
        </div>
        <HealthScoreBadge composite={composite} />
      </div>

      {/* Primary stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <StatCard title="Members" value={members.length} delta={`${activeCount} active`} icon={<Users size={18} />} />
        <StatCard title="New members" value={newMembers} icon={<Users size={18} />} />
        <StatCard title="Alumni" value={alumniCount} icon={<Users size={18} />} />
        <StatCard title="Dues collected" value={formatCurrency(totalCollected)} delta={`${collectionRate}%`} deltaType={collectionRate >= 75 ? "up" : "down"} icon={<DollarSign size={18} />} />
        <StatCard title="Upcoming events" value={events.length} icon={<Calendar size={18} />} />
        <StatCard title="Tasks due soon" value={tasksDue} deltaType={tasksDue > 3 ? "down" : "neutral"} icon={<CheckCircle2 size={18} />} />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Pending reimbursements" value={pendingReimbs.length} delta={formatCurrency(pendingReimbAmount)} deltaType={pendingReimbs.length > 0 ? "down" : "neutral"} icon={<DollarSign size={18} />} />
        <StatCard title="Budget used" value={budgetTotal > 0 ? `${budgetPct}%` : "—"} delta={budgetTotal > 0 ? `${formatCurrency(budgetUsed)} of ${formatCurrency(budgetTotal)}` : "No budget set"} deltaType={budgetPct > 90 ? "down" : "neutral"} icon={<TrendingUp size={18} />} />
        <StatCard title="Forms incomplete" value={formsIncomplete} deltaType={formsIncomplete > 0 ? "down" : "up"} icon={<FileText size={18} />} />
        <StatCard title="Avg attendance" value={`${avgAttendance}%`} deltaType={avgAttendance >= 75 ? "up" : "down"} icon={<TrendingUp size={18} />} />
      </div>

      {/* Alerts */}
      <div className="space-y-2">
        {!complianceOk && (
          <Alert type="warning" title="Compliance attention needed" description={`${formsIncomplete} members with incomplete forms · ${overdueCount} overdue payments · ${pendingReimbs.length} pending reimbursements`} />
        )}
        {overdueCount > 0 && (
          <Alert type="warning" title={`${overdueCount} overdue payment${overdueCount > 1 ? "s" : ""}`} description="Review in Dues & Payments." />
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Health breakdown */}
        <Card>
          <CardHeader title="Organization health" icon={<Heart size={16} />} action={<Link href="/health" className="text-xs text-greek-600 hover:underline">Details</Link>} />
          <div className="space-y-3">
            {Object.entries(breakdown).map(([key, val]) => (
              val !== undefined && (
                <ProgressBar
                  key={key}
                  value={val as number}
                  label={key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                  color={(val as number) >= 80 ? "green" : (val as number) >= 60 ? "yellow" : "red"}
                  size="sm"
                />
              )
            ))}
          </div>
        </Card>

        {/* Compliance status */}
        <Card>
          <CardHeader title="Compliance status" icon={<Shield size={16} />} action={<Link href="/forms" className="text-xs text-greek-600 hover:underline">Forms</Link>} />
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Forms complete", ok: formsIncomplete === 0, detail: formsIncomplete === 0 ? "All members current" : `${formsIncomplete} incomplete` },
              { label: "Dues current", ok: overdueCount === 0, detail: overdueCount === 0 ? "No overdue" : `${overdueCount} overdue` },
              { label: "Reimbursements", ok: pendingReimbs.length === 0, detail: pendingReimbs.length === 0 ? "None pending" : `${pendingReimbs.length} pending` },
              { label: "Budget", ok: budgetPct <= 90 || budgetTotal === 0, detail: budgetTotal > 0 ? `${budgetPct}% used` : "Not configured" },
            ].map((item) => (
              <div key={item.label} className={`p-3 rounded-lg border ${item.ok ? "border-green-200 bg-green-50/50 dark:bg-green-950/10" : "border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/10"}`}>
                <div className="flex items-center gap-2 mb-1">
                  {item.ok ? <CheckCircle2 size={14} className="text-green-600" /> : <AlertTriangle size={14} className="text-yellow-600" />}
                  <p className="text-sm font-medium">{item.label}</p>
                </div>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Upcoming events */}
        <Card>
          <CardHeader title="Upcoming events" icon={<Calendar size={16} />} action={<Link href="/events" className="text-xs text-greek-600 hover:underline">View all</Link>} />
          {events.length === 0 ? (
            <EmptyState icon={<Calendar size={20} />} title="No upcoming events" action={<Link href="/events/new" className="text-sm text-greek-600 hover:underline">Create event →</Link>} />
          ) : (
            <div className="space-y-3">
              {events.map((e) => (
                <Link key={e.id} href={`/events/${e.id}`} className="flex items-start gap-3 hover:bg-surface-1 rounded-lg p-2 -mx-2 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-greek-50 dark:bg-greek-950/30 flex items-center justify-center text-greek-600 flex-shrink-0">
                    <Calendar size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{e.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(e.starts_at)}</p>
                  </div>
                  <Badge label={e.type.replace("_", " ")} color="blue" className="flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Announcements */}
        <Card>
          <CardHeader title="Recent announcements" icon={<Zap size={16} />} action={<Link href="/comms" className="text-xs text-greek-600 hover:underline">View all</Link>} />
          {announcements.length === 0 ? (
            <EmptyState icon={<Zap size={20} />} title="No announcements" />
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="flex items-start gap-3">
                  {a.pinned && <AlertTriangle size={14} className="text-yellow-500 mt-0.5 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Dues collection */}
        <Card>
          <CardHeader title="Unpaid balances" icon={<DollarSign size={16} />} action={<Link href="/payments" className="text-xs text-greek-600 hover:underline">Manage</Link>} />
          <ProgressBar value={collectionRate} label={`${formatCurrency(totalCollected)} of ${formatCurrency(totalExpected)}`} color={collectionRate >= 75 ? "green" : collectionRate >= 50 ? "yellow" : "red"} size="md" />
          <div className="grid grid-cols-3 gap-3 text-center mt-4">
            {[
              { label: "Paid", value: payments.filter((p) => p.status === "paid").length, color: "text-green-600" },
              { label: "Pending", value: payments.filter((p) => p.status === "pending").length, color: "text-yellow-600" },
              { label: "Overdue", value: overdueCount, color: "text-red-500" },
            ].map((s) => (
              <div key={s.label} className="bg-surface-1 rounded-lg py-2">
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          {unpaidMembers > 0 && <p className="text-xs text-muted-foreground mt-3">{unpaidMembers} member{unpaidMembers > 1 ? "s" : ""} with outstanding balances</p>}
        </Card>

        {/* Tasks + deadlines */}
        <Card>
          <CardHeader title="Officer tasks & deadlines" icon={<CheckCircle2 size={16} />} action={<Link href="/tasks" className="text-xs text-greek-600 hover:underline">View all</Link>} />
          {tasks.length === 0 ? (
            <EmptyState icon={<CheckCircle2 size={20} />} title="All caught up!" />
          ) : (
            <div className="space-y-2">
              {tasks.map((t) => {
                const isOverdue = t.due_date && new Date(t.due_date) < new Date();
                return (
                  <Link key={t.id} href="/tasks" className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-1 transition-colors">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.priority === "urgent" ? "bg-red-500" : t.priority === "high" ? "bg-orange-500" : "bg-yellow-500"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      {t.assignee_name && <p className="text-xs text-muted-foreground">{t.assignee_name}</p>}
                    </div>
                    {t.due_date && <Badge label={isOverdue ? "Overdue" : formatDateTime(t.due_date)} color={isOverdue ? "red" : "gray"} className="flex-shrink-0" />}
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        {/* Recent media */}
        <Card className="lg:col-span-2">
          <CardHeader title="Recent photo activity" icon={<Image size={16} />} action={<Link href="/social" className="text-xs text-greek-600 hover:underline">Social hub</Link>} />
          {photos.length === 0 ? (
            <EmptyState icon={<Image size={20} />} title="No recent photos" description="Upload event photos from the Social page." />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {photos.map((p) => (
                <div key={String(p.id)} className="relative aspect-square rounded-lg overflow-hidden bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={String(p.url)} alt={String(p.caption ?? "Event photo")} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <Badge label={String(p.status)} color={p.status === "approved" ? "green" : "yellow"} className="text-[10px]" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Org-type dashboard */}
      {isGreekOrg(orgType) && (
        <Card>
          <CardHeader title="Chapter dashboard" icon={<Zap size={16} />} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <StatCard title="PNM pipeline" value={pnmLeads.filter((p) => !["accepted","declined","removed"].includes(p.status)).length} icon={<Zap size={16} />} />
            <StatCard title="Bids extended" value={pnmLeads.filter((p) => p.status === "bid_extended").length} icon={<Heart size={16} />} />
            <StatCard title="Risk events pending" value={0} icon={<Shield size={16} />} />
            <StatCard title="Engagement" value={`${avgAttendance}%`} icon={<TrendingUp size={16} />} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: "/pnm", label: "PNM Recruitment" }, { href: "/social", label: "Touse Social" },
              { href: "/risk", label: "Risk" }, { href: "/nme", label: "New Members" },
              { href: "/standards", label: "Standards" }, { href: "/alumni", label: "Alumni CRM" },
              { href: "/philanthropy", label: "Philanthropy" }, { href: "/interchapter", label: "ExecLink" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="text-sm font-medium text-greek-600 hover:underline p-2 rounded-lg hover:bg-surface-1">{link.label} →</Link>
            ))}
          </div>
        </Card>
      )}

      {isSportsOrg(orgType) && (
        <Card>
          <CardHeader title="Team dashboard" icon={<Trophy size={16} />} action={<Link href="/sports" className="text-xs text-sports-600 hover:underline">Full dashboard</Link>} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard title="Injured players" value={members.filter((m) => (m as MemberProfile & { is_injured?: boolean }).is_injured).length} icon={<AlertTriangle size={16} />} />
            <StatCard title="Waivers complete" value={waivers.filter((w) => w.status === "completed").length} delta={`${waivers.length} total`} icon={<Shield size={16} />} />
            <StatCard title="Travel trips" value={(tripsRes.data ?? []).length} icon={<Calendar size={16} />} />
            <StatCard title="Tryout candidates" value={pnmLeads.length} icon={<Trophy size={16} />} />
          </div>
        </Card>
      )}
    </div>
  );
}
