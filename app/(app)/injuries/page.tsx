import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Alert, Badge, Button, Card, CardHeader, EmptyState, PageHeader, StatCard,
} from "@/components/ui";
import { AlertTriangle, CheckCircle2, Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Injury Reports" };
export const dynamic = "force-dynamic";

export default async function InjuriesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: m } = await supabase.from("org_members").select("org_id, role").eq("user_id", user.id).limit(1).single();
  if (!m) redirect("/onboarding");

  const officerRoles = ["captain","co_captain","coach","safety_officer","owner","president","advisor"];
  const isOfficer = officerRoles.includes(String(m.role));

  if (!isOfficer) {
    return (
      <div className="space-y-5">
        <PageHeader title="Injury Reports" />
        <Alert type="warning" title="Access restricted" description="Injury reports are only accessible to authorized roles: Captain, Coach, Safety Officer, and Advisors. This protects player privacy." />
      </div>
    );
  }

  const { data: injuriesData } = await supabase
    .from("sports_injuries")
    .select("*, member_profiles(full_name)")
    .eq("org_id", m.org_id)
    .order("incident_date", { ascending: false });

  const injuries = (injuriesData ?? []) as Array<Record<string, unknown>>;

  const active = injuries.filter((i) => !i.is_cleared);
  const cleared = injuries.filter((i) => i.is_cleared);

  const SEVERITY_COLOR: Record<string, string> = {
    minor: "green", moderate: "yellow", severe: "orange", critical: "red",
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Injury Reports"
        description="Restricted to authorized roles. All data is confidential."
        action={<Button size="sm" icon={<Plus size={14} />}>File report</Button>}
      />

      <Alert type="warning" title="Confidential data" description="Injury information is restricted to Captain, Coach, Safety Officer, and Advisors only." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Active injuries" value={active.length} deltaType={active.length > 0 ? "down" : "neutral"} icon={<AlertTriangle size={18} />} />
        <StatCard title="Cleared" value={cleared.length} deltaType="up" icon={<CheckCircle2 size={18} />} />
        <StatCard title="Total reports" value={injuries.length} icon={<AlertTriangle size={18} />} />
        <StatCard title="Critical/severe" value={injuries.filter((i) => ["critical","severe"].includes(String(i.severity))).length} deltaType="down" icon={<AlertTriangle size={18} />} />
      </div>

      {active.length > 0 && (
        <Card>
          <CardHeader title="Active injuries" description="Players currently not cleared for full participation" />
          <div className="space-y-3">
            {active.map((injury) => (
              <div key={String(injury.id)} className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-foreground">{String((injury.member_profiles as Record<string, unknown>)?.full_name ?? "Player")}</p>
                    <Badge label={String(injury.severity)} color={SEVERITY_COLOR[String(injury.severity)] as "green"} />
                    <Badge label={String(injury.body_area)} color="gray" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Incident: {formatDate(String(injury.incident_date))} · Context: {String(injury.context)}</p>
                  {injury.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{String(injury.description)}</p>}
                  {injury.return_to_play_date && (
                    <p className="text-xs text-blue-600 mt-1">Est. return: {formatDate(String(injury.return_to_play_date))}</p>
                  )}
                </div>
                <Badge label="Active" color="red" dot />
              </div>
            ))}
          </div>
        </Card>
      )}

      {cleared.length > 0 && (
        <Card>
          <CardHeader title="Cleared injuries" description="Players returned to full participation" />
          <div className="space-y-2">
            {cleared.slice(0, 8).map((injury) => (
              <div key={String(injury.id)} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-surface-1 transition-colors">
                <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{String((injury.member_profiles as Record<string, unknown>)?.full_name ?? "Player")}</p>
                  <p className="text-xs text-muted-foreground">{String(injury.body_area)} · {String(injury.severity)} · {formatDate(String(injury.incident_date))}</p>
                </div>
                <Badge label="Cleared" color="green" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {injuries.length === 0 && (
        <EmptyState icon={<CheckCircle2 size={24} />} title="No injury reports" description="All players are healthy. File a report when an injury occurs during practice, games, or travel." action={<Button size="sm" icon={<Plus size={14} />}>File report</Button>} />
      )}
    </div>
  );
}
