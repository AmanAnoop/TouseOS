import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Alert, Badge, Card, CardHeader, PageHeader, StatCard,
} from "@/components/ui";
import {
  Activity, Building, DollarSign, Eye,
  Shield, TrendingUp, Users, Zap,
} from "lucide-react";
import { formatCurrency, formatDate, timeAgo, orgTypeLabel } from "@/lib/utils";

export const metadata = { title: "Admin Dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check if owner/admin
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id, role, organizations(*)")
    .eq("user_id", user.id)
    .neq("status", "removed")
    .limit(1)
    .single();

  if (!membership) redirect("/onboarding");

  const role = String(membership.role);
  const isOrgAdmin = ["owner", "president", "vice_president", "advisor"].includes(role);

  if (!isOrgAdmin) {
    return (
      <div className="space-y-4">
        <PageHeader title="Admin Dashboard" />
        <Alert type="warning" title="Access restricted" description="Admin dashboard access requires Owner, President, or Advisor role." />
      </div>
    );
  }

  const orgId = membership.org_id;
  const org = membership.organizations as unknown as Record<string, unknown>;

  const [membersRes, paymentsRes, eventsRes, auditRes, reimbsRes] = await Promise.all([
    supabase.from("member_profiles").select("id, full_name, membership_status, payment_status, role, created_at").eq("org_id", orgId).order("full_name"),
    supabase.from("payments").select("amount, paid_amount, status, created_at").eq("org_id", orgId),
    supabase.from("events").select("id, title, starts_at, status, type").eq("org_id", orgId).order("starts_at", { ascending: false }).limit(5),
    supabase.from("audit_logs").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(20),
    supabase.from("reimbursements").select("amount, status").eq("org_id", orgId),
  ]);

  const members = membersRes.data ?? [];
  const payments = paymentsRes.data ?? [];
  const events = eventsRes.data ?? [];
  const auditLogs = auditRes.data ?? [];
  const reimbs = reimbsRes.data ?? [];

  const activeMembers = members.filter((m: Record<string, unknown>) => m.membership_status === "active");
  const totalCollected = payments.reduce((s: number, p: Record<string, unknown>) => s + Number(p.paid_amount), 0);
  const totalExpected = payments.reduce((s: number, p: Record<string, unknown>) => s + Number(p.amount), 0);
  const pendingReimbs = reimbs.filter((r: Record<string, unknown>) => r.status === "submitted").length;
  const pendingTasks = 0; // TODO: query tasks separately


  const STATUS_DISTRIBUTION = members.reduce<Record<string, number>>((acc, m: Record<string, unknown>) => {
    const s = String(m.membership_status ?? "active");
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  const AUDIT_ACTION_COLOR: Record<string, string> = {
    member_created: "blue",
    member_invited: "blue",
    event_created: "green",
    charge_created: "yellow",
    payment_received: "green",
    mass_sms_sent: "orange",
    reimbursement_submitted: "yellow",
    reimbursement_approved: "green",
    reimbursement_paid: "green",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={16} className="text-greek-600" />
            <span className="text-xs font-bold text-greek-600 uppercase tracking-wide">Admin</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{String(org.name)}</h1>
          <p className="text-sm text-muted-foreground capitalize">{orgTypeLabel(String(org.type))} · {String(org.campus ?? "Campus")} · Role: {role.replace("_", " ")}</p>
        </div>
        <Badge label={String(org.privacy)} color={org.privacy === "public" ? "green" : "gray"} />
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Active members" value={activeMembers.length} delta={`${members.length} total`} icon={<Users size={18} />} />
        <StatCard title="Dues collected" value={formatCurrency(totalCollected)} delta={totalExpected > 0 ? `${Math.round((totalCollected / totalExpected) * 100)}% of ${formatCurrency(totalExpected)}` : "—"} deltaType="up" icon={<DollarSign size={18} />} />
        <StatCard title="Pending reimbursements" value={pendingReimbs} deltaType={pendingReimbs > 0 ? "down" : "neutral"} icon={<TrendingUp size={18} />} />
        <StatCard title="Open tasks" value={pendingTasks} icon={<Activity size={18} />} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Organization profile */}
        <Card>
          <CardHeader title="Organization profile" icon={<Building size={16} />} />
          <div className="space-y-2">
            {[
              { label: "Type", value: orgTypeLabel(String(org.type)) },
              { label: "Campus", value: org.campus ?? "—" },
              { label: "Council/League", value: org.council_or_league ?? "—" },
              { label: "Contact email", value: org.contact_email ?? "—" },
              { label: "Invite code", value: org.invite_code },
              { label: "Privacy", value: org.privacy },
              { label: "Stripe connected", value: org.stripe_account_id ? "Yes" : "Not connected" },
              { label: "Created", value: formatDate(String(org.created_at)) },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-1 border-b border-border last:border-0">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-xs font-medium">{String(value ?? "—")}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Member breakdown */}
        <Card>
          <CardHeader title="Member breakdown" icon={<Users size={16} />} />
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">By status</p>
              {Object.entries(STATUS_DISTRIBUTION).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between py-1">
                  <span className="text-xs capitalize">{status.replace(/_/g, " ")}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 rounded-full bg-surface-2 w-16">
                      <div className="h-full rounded-full bg-greek-500" style={{ width: `${Math.round((count / members.length) * 100)}%` }} />
                    </div>
                    <span className="text-xs font-medium w-4 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">By payment</p>
              {[
                { label: "Current", count: members.filter((m: Record<string, unknown>) => m.payment_status === "current").length, color: "bg-green-500" },
                { label: "Overdue", count: members.filter((m: Record<string, unknown>) => m.payment_status === "overdue").length, color: "bg-red-500" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-1">
                  <span className="text-xs">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span className="text-xs font-medium">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Integrations */}
        <Card>
          <CardHeader title="Integrations" icon={<Zap size={16} />} />
          <div className="space-y-3">
            {[
              { name: "Supabase DB", status: "connected", desc: "Database, auth, storage, realtime" },
              { name: "Stripe", status: org.stripe_account_id ? "connected" : "not_connected", desc: "Payment processing" },
              { name: "Twilio SMS", status: process.env.NEXT_PUBLIC_SUPABASE_URL ? "configured" : "not_configured", desc: "Consent-based PNM texting" },
              { name: "OpenAI", status: "check_env", desc: "AI assistant features" },
              { name: "Supabase Storage", status: "connected", desc: "Photo & document storage" },
            ].map((integration) => (
              <div key={integration.name} className="flex items-start gap-3 p-2 rounded-lg border border-border">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${integration.status === "connected" || integration.status === "configured" ? "bg-green-500" : "bg-yellow-500"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{integration.name}</p>
                  <p className="text-[10px] text-muted-foreground">{integration.desc}</p>
                </div>
                <Badge label={integration.status.replace("_", " ")} color={integration.status.includes("connected") || integration.status === "configured" ? "green" : "yellow"} className="text-[10px]" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent events */}
      <Card>
        <CardHeader title="Recent events" icon={<Activity size={16} />} />
        <div className="space-y-2">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet.</p>
          ) : (
            events.map((e: Record<string, unknown>) => (
              <div key={String(e.id)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-1 transition-colors">
                <Badge label={String(e.type).replace(/_/g, " ")} color="blue" className="flex-shrink-0" />
                <p className="text-sm flex-1">{String(e.title)}</p>
                <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(String(e.starts_at))}</span>
                <Badge label={String(e.status)} color={e.status === "upcoming" ? "green" : "gray"} />
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Audit log */}
      <Card>
        <CardHeader title="Audit log" description="Sensitive actions tracked for compliance" icon={<Eye size={16} />} />
        <div className="space-y-1">
          {auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No audit log entries yet.</p>
          ) : (
            auditLogs.map((log: Record<string, unknown>) => (
              <div key={String(log.id)} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{
                  background: AUDIT_ACTION_COLOR[String(log.action)] === "green" ? "#22c55e" :
                    AUDIT_ACTION_COLOR[String(log.action)] === "blue" ? "#3b82f6" :
                    AUDIT_ACTION_COLOR[String(log.action)] === "orange" ? "#f97316" : "#eab308",
                }} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-mono text-foreground">{String(log.action)}</span>
                  {Boolean(log.actor_name) && <span className="text-xs text-muted-foreground ml-2">by {String(log.actor_name)}</span>}
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">{timeAgo(String(log.created_at))}</span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
