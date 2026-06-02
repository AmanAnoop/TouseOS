import Link from "next/link";
import { requireOrgProduct } from "@/lib/org-access";
import { createClient } from "@/lib/supabase/server";
import {
  Alert, Badge, Button, Card, CardHeader, EmptyState, ProgressBar, StatCard,
} from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { Calendar, DollarSign, HandHeart, Users, Zap } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "ClubOS Dashboard" };

export default async function ClubDashboardPage() {
  const { orgId } = await requireOrgProduct(["club"]);
  const supabase = await createClient();

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

  const activeMembers = members.filter((m) => m.membership_status === "active").length;
  const totalExpected = payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalCollected = payments.reduce((s, p) => s + Number(p.paid_amount), 0);
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
  const totalHours = hours.reduce((s, h) => s + Number(h.hours), 0);
  const verifiedHours = hours.filter((h) => h.verified).reduce((s, h) => s + Number(h.hours), 0);
  const pendingApps = applications.filter((a) => ["applied", "interview"].includes(String(a.status))).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-club-600 flex items-center justify-center text-white text-xs font-bold">
              CL
            </div>
            <span className="text-sm font-semibold text-club-600 uppercase tracking-wide">ClubOS</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Organization Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Membership, events, service, and finances for your student organization
          </p>
        </div>
        <Link href="/events/new">
          <Button size="sm" className="bg-club-600 hover:bg-club-700 officer-touch">
            <Calendar size={14} />
            Plan event
          </Button>
        </Link>
      </div>

      {pendingApps > 0 && (
        <Alert
          type="info"
          title={`${pendingApps} membership application${pendingApps > 1 ? "s" : ""} pending`}
          description="Review applicants and move them through your membership pipeline."
        />
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
                  <p className="text-xs text-muted-foreground capitalize">{String(e.type).replace(/_/g, " ")}</p>
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

      <Card padding="sm">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">ClubOS modules</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { href: "/club/membership", label: "Membership" },
            { href: "/club/committees", label: "Committees" },
            { href: "/club/service-hours", label: "Service hours" },
            { href: "/roster", label: "Roster" },
            { href: "/budget", label: "Budget" },
            { href: "/forms", label: "Forms" },
            { href: "/social", label: "Photos" },
            { href: "/philanthropy", label: "Fundraising" },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-club-600 hover:underline p-2 rounded-lg hover:bg-club-50/50 dark:hover:bg-club-950/20">
              {l.label} →
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
