import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadActiveMembershipServer } from "@/lib/active-org-membership-server";
import { loadDashboardData } from "@/lib/dashboard-data";
import { isDashboardOfficer } from "@/lib/dashboard-roles";
import {
  StatCard, Card, CardHeader, Badge, ProgressBar,
  EmptyState, Alert,
} from "@/components/ui";
import {
  formatCurrency, formatDateTime, isGreekOrg, isSportsOrg, isClubOrg,
} from "@/lib/utils";
import { getProductId, productLabel } from "@/lib/org-product";
import { HealthScoreBadge } from "@/components/dashboard/health-score-badge";
import { OfficerQuickActions } from "@/components/dashboard/officer-quick-actions";
import { AttendanceTrendChart } from "@/components/dashboard/attendance-trend-chart";
import { EngagementTrendChart } from "@/components/dashboard/engagement-trend-chart";
import { UpcomingDeadlines } from "@/components/dashboard/upcoming-deadlines";
import { GettingStarted } from "@/components/dashboard/getting-started";
import { MemberSnapshot } from "@/components/dashboard/member-snapshot";
import {
  AlertTriangle, Calendar, CheckCircle2, DollarSign, FileText,
  Heart, Image as ImageIcon, Shield, TrendingUp, Trophy, Users, Zap,
} from "lucide-react";
import type { MemberProfile } from "@/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const activeMembership = await loadActiveMembershipServer(user.id);
  if (!activeMembership) redirect("/onboarding");

  const orgId = activeMembership.orgId;
  const { data: orgRow } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();

  const org = (orgRow ?? {}) as Record<string, unknown>;
  const orgType = activeMembership.orgType || String(org.type ?? "general_org");
  const product = getProductId(orgType);
  if (product === "sports") redirect("/sports");
  if (product === "club") redirect("/club");

  const myRole = String(activeMembership.role ?? "general_member");
  const isOfficer = isDashboardOfficer(myRole);

  const data = await loadDashboardData(supabase, {
    orgId,
    orgType,
    userId: user.id,
  });

  const {
    members, events, payments, announcements, tasks, myTasks, myProfile,
    photos, pnmLeads, sportsTrips, waivers, sportsTryouts,
    clubApplications, attendanceTrend, engagementTrend, deadlineItems,
    setupSteps, stats, health,
  } = data;

  const { breakdown, composite, metricsUsed } = health;
  const {
    activeCount, newMembers, alumniCount, totalCollected, collectionRate,
    overdueCount, unpaidMembers, pendingReimbs, pendingReimbAmount,
    budgetUsed, budgetTotal, budgetPct, formsIncomplete, avgAttendance,
    tasksDue, complianceOk, totalClubHours,
  } = stats;

  const urgentDeadlines = deadlineItems.filter((d) => d.overdue).length;
  const showGettingStarted = isOfficer && setupSteps.some((s) => !s.done);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{String(org.name)}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {productLabel(product)} workspace
            {!isOfficer && " · Member view"}
          </p>
        </div>
        {isOfficer && (
          <HealthScoreBadge composite={composite} metricsUsed={metricsUsed} />
        )}
      </div>

      <OfficerQuickActions role={myRole} orgType={orgType} />

      {!isOfficer && (
        <MemberSnapshot profile={myProfile} events={events} myTasks={myTasks} />
      )}

      {showGettingStarted && <GettingStarted steps={setupSteps} />}

      {isOfficer && urgentDeadlines > 0 && (
        <Alert
          type="warning"
          title={`${urgentDeadlines} overdue deadline${urgentDeadlines > 1 ? "s" : ""}`}
          description="Review tasks, payments, and forms below."
        />
      )}

      {isOfficer && (
        <UpcomingDeadlines items={deadlineItems} />
      )}

      {isOfficer ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          <StatCard title="Members" value={members.length} delta={`${activeCount} active`} icon={<Users size={18} />} />
          <StatCard title="New members" value={newMembers} icon={<Users size={18} />} />
          <StatCard title="Dues collected" value={formatCurrency(totalCollected)} delta={`${collectionRate}%`} deltaType={collectionRate >= 75 ? "up" : "down"} icon={<DollarSign size={18} />} />
          <StatCard title="Upcoming events" value={events.length} icon={<Calendar size={18} />} />
          <StatCard title="Tasks due soon" value={tasksDue} deltaType={tasksDue > 3 ? "down" : "neutral"} icon={<CheckCircle2 size={18} />} />
          <StatCard title="Avg attendance" value={`${avgAttendance}%`} deltaType={avgAttendance >= 75 ? "up" : "down"} icon={<TrendingUp size={18} />} />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard title="Upcoming events" value={events.length} icon={<Calendar size={18} />} />
          <StatCard title="Your open tasks" value={myTasks.length} icon={<CheckCircle2 size={18} />} />
          <StatCard title="Chapter members" value={members.length} icon={<Users size={18} />} />
          <StatCard title="Announcements" value={announcements.length} icon={<Zap size={18} />} />
        </div>
      )}

      {isOfficer && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard title="Alumni" value={alumniCount} icon={<Users size={18} />} />
          <StatCard title="Pending reimbursements" value={pendingReimbs} delta={formatCurrency(pendingReimbAmount)} deltaType={pendingReimbs > 0 ? "down" : "neutral"} icon={<DollarSign size={18} />} />
          <StatCard title="Budget used" value={budgetTotal > 0 ? `${budgetPct}%` : "—"} delta={budgetTotal > 0 ? `${formatCurrency(budgetUsed)} of ${formatCurrency(budgetTotal)}` : "No budget set"} deltaType={budgetPct > 90 ? "down" : "neutral"} icon={<TrendingUp size={18} />} />
          <StatCard title="Forms incomplete" value={formsIncomplete} deltaType={formsIncomplete > 0 ? "down" : "up"} icon={<FileText size={18} />} />
        </div>
      )}

      {isOfficer && !complianceOk && (
        <Alert
          type="warning"
          title="Compliance attention needed"
          description={`${formsIncomplete} members with incomplete forms · ${overdueCount} overdue payments · ${pendingReimbs} pending reimbursements`}
        />
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {isOfficer && (
          <>
            <Card>
              <CardHeader title="Organization health" icon={<Heart size={16} />} action={<Link href="/health" className="text-xs text-greek-600 hover:underline">Details</Link>} />
              <div className="space-y-3">
                {Object.entries(breakdown).map(([key, val]) => (
                  typeof val === "number" && (
                    <ProgressBar
                      key={key}
                      value={val}
                      label={key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                      color={val >= 80 ? "green" : val >= 60 ? "yellow" : "red"}
                      size="sm"
                    />
                  )
                ))}
                {composite === null && (
                  <p className="text-xs text-muted-foreground">Add dues, events, or a budget to calculate health score.</p>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader title="Compliance status" icon={<Shield size={16} />} action={<Link href="/forms" className="text-xs text-greek-600 hover:underline">Forms</Link>} />
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Forms complete", ok: formsIncomplete === 0, detail: formsIncomplete === 0 ? "All members current" : `${formsIncomplete} incomplete` },
                  { label: "Dues current", ok: overdueCount === 0, detail: overdueCount === 0 ? "No overdue" : `${overdueCount} overdue` },
                  { label: "Reimbursements", ok: pendingReimbs === 0, detail: pendingReimbs === 0 ? "None pending" : `${pendingReimbs} pending` },
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

            <AttendanceTrendChart points={attendanceTrend} />
            <EngagementTrendChart points={engagementTrend} />
          </>
        )}

        <Card>
          <CardHeader title="Upcoming events" icon={<Calendar size={16} />} action={<Link href="/events" className="text-xs text-greek-600 hover:underline">View all</Link>} />
          {events.length === 0 ? (
            <EmptyState
              icon={<Calendar size={20} />}
              title="No upcoming events"
              action={isOfficer ? <Link href="/events/new" className="text-sm text-greek-600 hover:underline">Create event →</Link> : undefined}
            />
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

        {isOfficer && (
          <>
            <Card>
              <CardHeader title="Unpaid balances" icon={<DollarSign size={16} />} action={<Link href="/payments" className="text-xs text-greek-600 hover:underline">Manage</Link>} />
              <ProgressBar value={collectionRate} label={`${formatCurrency(totalCollected)} collected`} color={collectionRate >= 75 ? "green" : collectionRate >= 50 ? "yellow" : "red"} size="md" />
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
              {unpaidMembers > 0 && (
                <p className="text-xs text-muted-foreground mt-3">
                  {unpaidMembers} member{unpaidMembers > 1 ? "s" : ""} with outstanding balances
                </p>
              )}
            </Card>

            <Card>
              <CardHeader title="Officer tasks" icon={<CheckCircle2 size={16} />} action={<Link href="/tasks" className="text-xs text-greek-600 hover:underline">View all</Link>} />
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
                        {t.due_date && (
                          <Badge label={isOverdue ? "Overdue" : formatDateTime(t.due_date)} color={isOverdue ? "red" : "gray"} className="flex-shrink-0" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </Card>
          </>
        )}

        <Card className={isOfficer ? "lg:col-span-2" : ""}>
          <CardHeader title="Recent photo activity" icon={<ImageIcon size={16} aria-hidden />} action={<Link href="/social" className="text-xs text-greek-600 hover:underline">Social hub</Link>} />
          {photos.length === 0 ? (
            <EmptyState icon={<ImageIcon size={20} aria-hidden />} title="No recent photos" description="Upload event photos from the Social page." />
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

      {isGreekOrg(orgType) && isOfficer && (
        <Card>
          <CardHeader title="Chapter dashboard" icon={<Zap size={16} />} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <StatCard title="PNM pipeline" value={pnmLeads.filter((p) => !["accepted", "declined", "removed"].includes(p.status)).length} icon={<Zap size={16} />} />
            <StatCard title="Bids extended" value={pnmLeads.filter((p) => p.status === "bid_extended").length} icon={<Heart size={16} />} />
            <StatCard title="Engagement" value={`${avgAttendance}%`} icon={<TrendingUp size={16} />} />
            <StatCard title="Members" value={activeCount} icon={<Users size={16} />} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: "/pnm", label: "PNM Recruitment" },
              { href: "/social", label: "Touse Social" },
              { href: "/risk", label: "Risk" },
              { href: "/nme", label: "New Members" },
              { href: "/standards", label: "Standards" },
              { href: "/alumni", label: "Alumni CRM" },
              { href: "/philanthropy", label: "Philanthropy" },
              { href: "/interchapter", label: "ExecLink" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="text-sm font-medium text-greek-600 hover:underline p-2 rounded-lg hover:bg-surface-1">
                {link.label} →
              </Link>
            ))}
          </div>
        </Card>
      )}

      {isSportsOrg(orgType) && (
        <Card>
          <CardHeader title="Team snapshot" icon={<Trophy size={16} />} action={<Link href="/sports" className="text-xs text-sports-600 hover:underline">Team home</Link>} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard title="Injured players" value={members.filter((m) => (m as MemberProfile & { is_injured?: boolean }).is_injured).length} icon={<AlertTriangle size={16} />} />
            <StatCard title="Waivers complete" value={waivers.filter((w) => w.status === "completed").length} delta={`${waivers.length} total`} icon={<Shield size={16} />} />
            <StatCard title="Travel trips" value={sportsTrips.length} icon={<Calendar size={16} />} />
            <StatCard title="Tryout candidates" value={sportsTryouts.filter((t) => !["accepted", "cut"].includes(t.status)).length} icon={<Trophy size={16} />} />
          </div>
        </Card>
      )}

      {isClubOrg(orgType) && (
        <Card>
          <CardHeader title="Club snapshot" icon={<Users size={16} />} action={<Link href="/club" className="text-xs text-club-600 hover:underline">Club home</Link>} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <StatCard title="Active members" value={members.filter((m) => m.membership_status === "active").length} icon={<Users size={16} />} />
            <StatCard title="Membership apps" value={clubApplications.filter((a) => a.status === "applied").length} icon={<Zap size={16} />} />
            <StatCard title="Service hours" value={totalClubHours.toFixed(1)} icon={<Heart size={16} />} />
            <StatCard title="Collection rate" value={`${collectionRate}%`} icon={<DollarSign size={16} />} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: "/club/membership", label: "Membership" },
              { href: "/club/committees", label: "Committees" },
              { href: "/club/service-hours", label: "Service hours" },
              { href: "/philanthropy", label: "Fundraising" },
              { href: "/social", label: "Photos & updates" },
              { href: "/events", label: "Events" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="text-sm font-medium text-club-600 hover:underline p-2 rounded-lg hover:bg-surface-1">
                {link.label} →
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
