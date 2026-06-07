import Link from "next/link";
import { requireOrgProduct } from "@/lib/org-access";
import { createClient } from "@/lib/supabase/server";
import { isDashboardOfficer } from "@/lib/dashboard-roles";
import { getUniversityById } from "@/lib/university-colors";
import {
  Alert, Badge, Button, Card, CardHeader, EmptyState, ProgressBar, StatCard,
} from "@/components/ui";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { ClubPulseBadge } from "@/components/dashboard/club-pulse-badge";
import { ProductHomeShortcuts } from "@/components/dashboard/product-home-shortcuts";
import { MemberSnapshot } from "@/components/dashboard/member-snapshot";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Calendar, DollarSign, HandHeart, Users, Zap } from "lucide-react";
import type { Event, MemberProfile, Task } from "@/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Organization Dashboard" };

function campusDescription(university: ReturnType<typeof getUniversityById>): string | undefined {
  if (university) {
    return `${university.name} colors active · Change campus in Settings`;
  }
  return "Set your university in Settings for campus colors";
}

export default async function ClubDashboardPage() {
  const { orgId, role, userId } = await requireOrgProduct(["club"]);
  const isOfficer = isDashboardOfficer(role);
  const supabase = await createClient();
  const { data: orgRow } = await supabase.from("organizations").select("name, settings").eq("id", orgId).single();
  const orgName = String(orgRow?.name ?? "");
  const settings = (orgRow?.settings ?? {}) as Record<string, unknown>;
  const university = getUniversityById(
    typeof settings.university_id === "string" ? settings.university_id : undefined,
  );

  if (!isOfficer) {
    const [profileRes, eventsRes, tasksRes, assigneesRes] = await Promise.all([
      supabase.from("member_profiles").select("*").eq("org_id", orgId).eq("user_id", userId).maybeSingle(),
      supabase.from("events").select("id, title, starts_at, type").eq("org_id", orgId).gte("starts_at", new Date().toISOString()).order("starts_at").limit(5),
      supabase.from("tasks").select("id, title, status, priority, due_date, assignee_name, assigned_to").eq("org_id", orgId).neq("status", "done").neq("status", "cancelled").order("due_date").limit(12),
      supabase.from("task_assignees").select("task_id").eq("user_id", userId),
    ]);

    const myProfile = (profileRes.data ?? null) as MemberProfile | null;
    const memberId = myProfile?.id;
    const { data: myHoursRows } = memberId
      ? await supabase.from("club_service_hours").select("hours, verified").eq("org_id", orgId).eq("member_id", memberId)
      : { data: [] as Array<{ hours: number; verified: boolean }> };

    const events = (eventsRes.data ?? []) as Event[];
    const assigneeIds = new Set(((assigneesRes.data ?? []) as Array<{ task_id: string }>).map((r) => r.task_id));
    const myTasks = ((tasksRes.data ?? []) as Task[]).filter(
      (t) => t.assigned_to === userId || assigneeIds.has(t.id),
    ).slice(0, 6);
    const myHours = (myHoursRows ?? []).reduce((s, h) => s + Number(h.hours), 0);
    const myVerified = (myHoursRows ?? []).filter((h) => h.verified).reduce((s, h) => s + Number(h.hours), 0);

    return (
      <DashboardPageShell
        product="club"
        title="Organization Dashboard"
        orgName={orgName}
        isOfficer={false}
        description="Your service hours, events, and tasks"
      >
        <MemberSnapshot profile={myProfile} events={events} myTasks={myTasks} />

        <div className="ds-stat-grid">
          <StatCard title="Your service hours" value={myHours.toFixed(1)} delta={`${myVerified.toFixed(1)} verified`} icon={<HandHeart size={18} />} />
          <StatCard title="Upcoming events" value={events.length} icon={<Calendar size={18} />} />
          <StatCard title="Open tasks" value={myTasks.length} icon={<Users size={18} />} />
        </div>

        <Card>
          <CardHeader title="Upcoming events" icon={<Calendar size={16} />} action={<Link href="/events" className="text-xs text-club-600 hover:underline">All events</Link>} />
          {events.length === 0 ? (
            <EmptyState icon={<Calendar size={20} />} title="No upcoming events" />
          ) : (
            <div className="space-y-2">
              {events.map((e) => (
                <Link key={e.id} href={`/events/${e.id}`} className="block p-2 rounded-lg hover:bg-surface-1">
                  <p className="text-sm font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(e.starts_at)}</p>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <ProductHomeShortcuts
          title="Organization modules"
          product="club"
          links={[
            { href: "/club/service-hours", label: "Service hours" },
            { href: "/roster", label: "Roster" },
            { href: "/events", label: "Events" },
            { href: "/payments", label: "Dues" },
            { href: "/forms", label: "Forms" },
          ]}
        />
      </DashboardPageShell>
    );
  }

  const [membersRes, paymentsRes, eventsRes, appsRes, hoursRes, tasksRes] = await Promise.all([
    supabase.from("member_profiles").select("id, membership_status, payment_status").eq("org_id", orgId),
    supabase.from("payments").select("amount, paid_amount, status").eq("org_id", orgId),
    supabase.from("events").select("id, title, starts_at, type").eq("org_id", orgId).gte("starts_at", new Date().toISOString()).order("starts_at").limit(5),
    supabase.from("club_membership_applications").select("id, full_name, status, created_at").eq("org_id", orgId).order("created_at", { ascending: false }).limit(6),
    supabase.from("club_service_hours").select("hours, verified").eq("org_id", orgId),
    supabase.from("tasks").select("id, title, due_date, status").eq("org_id", orgId).neq("status", "done").order("due_date").limit(5),
  ]);

  const members = membersRes.data ?? [];
  const payments = paymentsRes.data ?? [];
  const events = eventsRes.data ?? [];
  const applications = appsRes.data ?? [];
  const hours = hoursRes.data ?? [];
  const tasks = tasksRes.data ?? [];

  const activeMembers = members.filter((m) => m.membership_status === "active" || m.membership_status === "new_member").length;
  const totalExpected = payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalCollected = payments.reduce((s, p) => s + Number(p.paid_amount), 0);
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
  const totalHours = hours.reduce((s, h) => s + Number(h.hours), 0);
  const verifiedHours = hours.filter((h) => h.verified).reduce((s, h) => s + Number(h.hours), 0);
  const pendingApps = applications.filter((a) => ["applied", "interview"].includes(String(a.status))).length;

  return (
    <DashboardPageShell
      product="club"
      title="Organization Dashboard"
      orgName={orgName}
      isOfficer
      description={campusDescription(university)}
      action={(
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <ClubPulseBadge activeMembers={activeMembers} collectionRate={collectionRate} />
          <Link href="/events/new">
            <Button size="sm" className="officer-touch">
              <Calendar size={14} />
              Plan event
            </Button>
          </Link>
        </div>
      )}
    >
      {pendingApps > 0 && (
        <Alert
          type="info"
          title={`${pendingApps} membership application${pendingApps > 1 ? "s" : ""} pending`}
          description="Review applicants and move them through your membership pipeline."
        />
      )}

      <div className="ds-stat-grid">
        <StatCard title="Active members" value={activeMembers} icon={<Users size={18} />} />
        <StatCard title="Dues collected" value={`${collectionRate}%`} delta={formatCurrency(totalCollected)} icon={<DollarSign size={18} />} />
        <StatCard title="Service hours" value={totalHours.toFixed(1)} delta={`${verifiedHours.toFixed(1)} verified`} icon={<HandHeart size={18} />} />
        <StatCard title="Upcoming events" value={events.length} icon={<Calendar size={18} />} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Membership pipeline" icon={<Zap size={16} />} action={<Link href="/club/membership" className="text-xs text-club-600 hover:underline">Manage</Link>} />
          {applications.length === 0 ? (
            <EmptyState icon={<Users size={20} />} title="No applications yet" description="Track interest forms and onboarding for new members." />
          ) : (
            <div className="space-y-2">
              {applications.map((a) => (
                <div key={String(a.id)} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-surface-1">
                  <p className="text-sm font-medium truncate">{String(a.full_name)}</p>
                  <Badge label={String(a.status)} color={a.status === "accepted" ? "green" : "yellow"} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Service & impact" icon={<HandHeart size={16} />} action={<Link href="/club/service-hours" className="text-xs text-club-600 hover:underline">Log hours</Link>} />
          <ProgressBar
            value={totalHours > 0 ? Math.round((verifiedHours / totalHours) * 100) : 0}
            label={`${verifiedHours.toFixed(1)} of ${totalHours.toFixed(1)} hours verified`}
            color="green"
            size="md"
          />
          <p className="text-xs text-muted-foreground mt-3">
            Track volunteer work for awards, university recognition, and national org requirements.
          </p>
        </Card>

        <Card>
          <CardHeader title="Upcoming events" icon={<Calendar size={16} />} action={<Link href="/events" className="text-xs text-club-600 hover:underline">All events</Link>} />
          {events.length === 0 ? (
            <EmptyState icon={<Calendar size={20} />} title="No upcoming events" />
          ) : (
            <div className="space-y-2">
              {events.map((e) => (
                <Link key={String(e.id)} href={`/events/${e.id}`} className="block p-2 rounded-lg hover:bg-surface-1">
                  <p className="text-sm font-medium">{String(e.title)}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(String(e.starts_at))}</p>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Officer tasks" icon={<Users size={16} />} action={<Link href="/tasks" className="text-xs text-club-600 hover:underline">All tasks</Link>} />
          {tasks.length === 0 ? (
            <EmptyState icon={<Users size={20} />} title="No open tasks" />
          ) : (
            <div className="space-y-2">
              {tasks.map((t) => (
                <div key={String(t.id)} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border">
                  <p className="text-sm truncate">{String(t.title)}</p>
                  <Badge label={String(t.status)} color="gray" />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <ProductHomeShortcuts
        title="Organization modules"
        product="club"
        links={[
          { href: "/club/membership", label: "Membership" },
          { href: "/club/committees", label: "Committees" },
          { href: "/club/elections", label: "Elections" },
          { href: "/club/service-hours", label: "Service hours" },
          { href: "/roster", label: "Roster" },
          { href: "/finance", label: "Budget" },
          { href: "/forms", label: "Forms" },
          { href: "/philanthropy", label: "Fundraising" },
        ]}
      />
    </DashboardPageShell>
  );
}
