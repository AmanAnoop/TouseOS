import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  StatCard, Card, CardHeader, Badge, ProgressBar,
  EmptyState, Alert,
} from "@/components/ui";
import {
  formatCurrency, formatDateTime, isGreekOrg, isSportsOrg, getStatusColor,
} from "@/lib/utils";
import {
  AlertTriangle, Calendar, CheckCircle2, DollarSign,
  Image, Shield, Trophy, Users, Zap,
} from "lucide-react";
import type { Event, MemberProfile, Payment, Announcement, Task } from "@/types";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get org
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
  const org = membership.organizations as Record<string, unknown>;
  const orgType = String(org.type ?? "general_org");

  // Parallel data fetch
  const [
    membersRes,
    eventsRes,
    paymentsRes,
    announcementsRes,
    tasksRes,
  ] = await Promise.all([
    supabase.from("member_profiles").select("id, full_name, membership_status, payment_status").eq("org_id", orgId),
    supabase.from("events").select("id, title, type, starts_at, location, status").eq("org_id", orgId).gte("starts_at", new Date().toISOString()).order("starts_at").limit(5),
    supabase.from("payments").select("amount, paid_amount, status, due_date").eq("org_id", orgId),
    supabase.from("announcements").select("id, title, body, author_name, created_at, pinned").eq("org_id", orgId).order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(5),
    supabase.from("tasks").select("id, title, status, priority, due_date, assignee_name").eq("org_id", orgId).neq("status", "done").neq("status", "cancelled").order("due_date", { ascending: true }).limit(5),
  ]);

  const members = (membersRes.data ?? []) as MemberProfile[];
  const events = (eventsRes.data ?? []) as Event[];
  const payments = (paymentsRes.data ?? []) as Payment[];
  const announcements = (announcementsRes.data ?? []) as Announcement[];
  const tasks = (tasksRes.data ?? []) as Task[];

  const totalExpected = payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalCollected = payments.reduce((s, p) => s + Number(p.paid_amount), 0);
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
  const overdueCount = payments.filter((p) => p.status === "overdue").length;
  const unpaidMembers = members.filter((m) => m.payment_status !== "current").length;

  const tasksDue = tasks.filter(
    (t) => t.due_date && new Date(t.due_date) <= new Date(Date.now() + 3 * 86400000),
  ).length;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{String(org.name)}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {isGreekOrg(orgType) ? "TouseGreek" : isSportsOrg(orgType) ? "SportsOS" : "Organization"} workspace
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Members"
          value={members.length}
          delta={`${members.filter((m) => m.membership_status === "active").length} active`}
          icon={<Users size={18} />}
        />
        <StatCard
          title="Dues collected"
          value={formatCurrency(totalCollected)}
          delta={`${collectionRate}% of ${formatCurrency(totalExpected)}`}
          deltaType={collectionRate >= 75 ? "up" : "down"}
          icon={<DollarSign size={18} />}
        />
        <StatCard
          title="Upcoming events"
          value={events.length}
          icon={<Calendar size={18} />}
        />
        <StatCard
          title="Tasks due soon"
          value={tasksDue}
          deltaType={tasksDue > 3 ? "down" : "neutral"}
          icon={<CheckCircle2 size={18} />}
        />
      </div>

      {/* Alerts */}
      {(overdueCount > 0 || unpaidMembers > 0) && (
        <div className="space-y-2">
          {overdueCount > 0 && (
            <Alert
              type="warning"
              title={`${overdueCount} overdue payment${overdueCount > 1 ? "s" : ""}`}
              description="Review in the Dues & Payments tab."
            />
          )}
          {unpaidMembers > 0 && (
            <Alert
              type="warning"
              title={`${unpaidMembers} member${unpaidMembers > 1 ? "s" : ""} with outstanding balances`}
              description="Send payment reminders from the Payments page."
            />
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming events */}
        <Card>
          <CardHeader
            title="Upcoming events"
            icon={<Calendar size={16} />}
            action={
              <Link href="/events" className="text-xs text-greek-600 hover:underline">
                View all
              </Link>
            }
          />
          {events.length === 0 ? (
            <EmptyState
              icon={<Calendar size={20} />}
              title="No upcoming events"
              description="Create your first event to get started."
              action={
                <Link href="/events/new" className="text-sm text-greek-600 hover:underline">
                  Create event →
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {events.map((e) => (
                <Link
                  key={e.id}
                  href={`/events/${e.id}`}
                  className="flex items-start gap-3 hover:bg-surface-1 rounded-lg p-2 -mx-2 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-greek-50 dark:bg-greek-950/30 flex items-center justify-center text-greek-600 flex-shrink-0">
                    <Calendar size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{e.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(e.starts_at)}</p>
                    {e.location && <p className="text-xs text-muted-foreground">{e.location}</p>}
                  </div>
                  <Badge
                    label={e.type.replace("_", " ")}
                    color="blue"
                    className="flex-shrink-0"
                  />
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Announcements */}
        <Card>
          <CardHeader
            title="Announcements"
            icon={<Zap size={16} />}
            action={
              <Link href="/comms" className="text-xs text-greek-600 hover:underline">
                View all
              </Link>
            }
          />
          {announcements.length === 0 ? (
            <EmptyState
              icon={<Zap size={20} />}
              title="No announcements"
              action={
                <Link href="/comms/new" className="text-sm text-greek-600 hover:underline">
                  Post announcement →
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="flex items-start gap-3">
                  {a.pinned && <AlertTriangle size={14} className="text-yellow-500 mt-0.5 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.body}</p>
                    <p className="text-xs text-muted-foreground mt-1">{a.author_name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Payment collection progress */}
        <Card>
          <CardHeader
            title="Dues collection"
            icon={<DollarSign size={16} />}
            action={
              <Link href="/payments" className="text-xs text-greek-600 hover:underline">
                Manage
              </Link>
            }
          />
          <div className="space-y-4">
            <ProgressBar
              value={collectionRate}
              label={`${formatCurrency(totalCollected)} collected of ${formatCurrency(totalExpected)}`}
              color={collectionRate >= 75 ? "green" : collectionRate >= 50 ? "yellow" : "red"}
              size="md"
            />
            <div className="grid grid-cols-3 gap-3 text-center">
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
          </div>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader
            title="Open tasks"
            icon={<CheckCircle2 size={16} />}
            action={
              <Link href="/tasks" className="text-xs text-greek-600 hover:underline">
                View all
              </Link>
            }
          />
          {tasks.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 size={20} />}
              title="All caught up!"
              description="No open tasks."
            />
          ) : (
            <div className="space-y-2">
              {tasks.map((t) => {
                const isOverdue = t.due_date && new Date(t.due_date) < new Date();
                return (
                  <Link
                    key={t.id}
                    href="/tasks"
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-1 transition-colors"
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      t.priority === "urgent" ? "bg-red-500" :
                      t.priority === "high" ? "bg-orange-500" :
                      t.priority === "medium" ? "bg-yellow-500" : "bg-gray-400"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                      {t.assignee_name && (
                        <p className="text-xs text-muted-foreground">{t.assignee_name}</p>
                      )}
                    </div>
                    {t.due_date && (
                      <Badge
                        label={isOverdue ? "Overdue" : formatDateTime(t.due_date)}
                        color={isOverdue ? "red" : "gray"}
                        className="flex-shrink-0"
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Greek/Sports quick links */}
      {(isGreekOrg(orgType) || isSportsOrg(orgType)) && (
        <Card>
          <CardHeader
            title={isGreekOrg(orgType) ? "Greek Life features" : "SportsOS features"}
            icon={isGreekOrg(orgType) ? <Zap size={16} /> : <Trophy size={16} />}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {(isGreekOrg(orgType)
              ? [
                  { href: "/pnm", label: "PNM Recruitment", icon: <Zap size={16} />, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/30" },
                  { href: "/social", label: "Touse Social", icon: <Image size={16} />, color: "text-pink-600 bg-pink-50 dark:bg-pink-950/30" },
                  { href: "/risk", label: "Risk Management", icon: <Shield size={16} />, color: "text-red-600 bg-red-50 dark:bg-red-950/30" },
                  { href: "/nme", label: "New Members", icon: <Users size={16} />, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" },
                  { href: "/standards", label: "Standards", icon: <AlertTriangle size={16} />, color: "text-orange-600 bg-orange-50 dark:bg-orange-950/30" },
                  { href: "/alumni", label: "Alumni CRM", icon: <Users size={16} />, color: "text-green-600 bg-green-50 dark:bg-green-950/30" },
                  { href: "/philanthropy", label: "Philanthropy", icon: <DollarSign size={16} />, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" },
                  { href: "/interchapter", label: "ExecLink", icon: <Zap size={16} />, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30" },
                ]
              : [
                  { href: "/tryouts", label: "Tryouts", icon: <Trophy size={16} />, color: "text-blue-600 bg-blue-50" },
                  { href: "/waivers", label: "Waivers", icon: <Shield size={16} />, color: "text-green-600 bg-green-50" },
                  { href: "/travel", label: "Travel", icon: <Calendar size={16} />, color: "text-purple-600 bg-purple-50" },
                  { href: "/equipment", label: "Equipment", icon: <CheckCircle2 size={16} />, color: "text-orange-600 bg-orange-50" },
                  { href: "/injuries", label: "Injuries", icon: <AlertTriangle size={16} />, color: "text-red-600 bg-red-50" },
                  { href: "/coaches", label: "Coach Tools", icon: <Trophy size={16} />, color: "text-indigo-600 bg-indigo-50" },
                ]
            ).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 p-3 rounded-xl border border-border hover:bg-surface-1 transition-colors"
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${link.color}`}>
                  {link.icon}
                </span>
                <span className="text-sm font-medium text-foreground">{link.label}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
