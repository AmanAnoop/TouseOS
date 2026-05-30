import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Badge, Button, Card, CardHeader, EmptyState, PageHeader, ProgressBar, StatCard,
} from "@/components/ui";
import { CheckCircle2, Shield, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Waivers & Compliance" };
export const dynamic = "force-dynamic";

const WAIVER_TYPES = [
  { key: "liability", label: "Liability waiver", required: true, travel: false },
  { key: "concussion", label: "Concussion form", required: true, travel: false },
  { key: "emergency_contact", label: "Emergency contact form", required: true, travel: false },
  { key: "medical", label: "Medical information form", required: true, travel: false },
  { key: "travel_authorization", label: "Travel authorization", required: false, travel: true },
  { key: "driver_form", label: "Driver form", required: false, travel: true },
  { key: "code_of_conduct", label: "Code of conduct", required: true, travel: false },
  { key: "league_eligibility", label: "League eligibility form", required: true, travel: false },
  { key: "university_recreation", label: "University recreation form", required: true, travel: false },
];

export default async function WaiversPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: m } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single();
  if (!m) redirect("/onboarding");

  const [membersRes, waiversRes] = await Promise.all([
    supabase.from("member_profiles").select("id, full_name, membership_status").eq("org_id", m.org_id).eq("membership_status", "active"),
    supabase.from("sports_waivers").select("*").eq("org_id", m.org_id),
  ]);

  const members = (membersRes.data ?? []) as Array<Record<string, unknown>>;
  const waivers = (waiversRes.data ?? []) as Array<Record<string, unknown>>;

  const requiredTypes = WAIVER_TYPES.filter((t) => t.required).map((t) => t.key);
  const totalRequired = members.length * requiredTypes.length;
  const completed = waivers.filter((w) => w.status === "completed" && requiredTypes.includes(String(w.waiver_type))).length;
  const missing = totalRequired - completed;
  const completionRate = totalRequired > 0 ? Math.round((completed / totalRequired) * 100) : 100;

  const memberStatus = members.map((member) => {
    const memberWaivers = waivers.filter((w) => w.member_id === member.id);
    const completedCount = memberWaivers.filter((w) => w.status === "completed" && requiredTypes.includes(String(w.waiver_type))).length;
    const missingWaivers = requiredTypes.filter((type) =>
      !memberWaivers.find((w) => w.waiver_type === type && w.status === "completed"),
    );
    return { ...member, completedCount, missingWaivers, pct: Math.round((completedCount / requiredTypes.length) * 100) };
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Waivers & Compliance"
        description="Track required forms, eligibility, and compliance for all players"
        action={<Button size="sm" icon={<Shield size={14} />}>Upload waiver</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Completion rate" value={`${completionRate}%`} deltaType={completionRate === 100 ? "up" : "down"} icon={<CheckCircle2 size={18} />} />
        <StatCard title="Completed" value={completed} deltaType="up" icon={<CheckCircle2 size={18} />} />
        <StatCard title="Missing" value={missing} deltaType={missing > 0 ? "down" : "neutral"} icon={<AlertTriangle size={18} />} />
        <StatCard title="Total players" value={members.length} icon={<Shield size={18} />} />
      </div>

      <Card>
        <CardHeader title="Overall waiver completion" />
        <ProgressBar value={completionRate} color={completionRate === 100 ? "green" : completionRate >= 75 ? "yellow" : "red"} size="md" label={`${completed}/${totalRequired} required waivers complete`} />
        <div className="mt-4 grid sm:grid-cols-3 gap-2">
          {WAIVER_TYPES.filter((t) => t.required).map((type) => {
            const typeCompleted = waivers.filter((w) => w.waiver_type === type.key && w.status === "completed").length;
            const typePct = members.length > 0 ? Math.round((typeCompleted / members.length) * 100) : 0;
            return (
              <div key={type.key} className="p-3 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-foreground">{type.label}</p>
                  <span className={`text-xs font-bold ${typePct === 100 ? "text-green-600" : "text-muted-foreground"}`}>{typePct}%</span>
                </div>
                <ProgressBar value={typePct} color={typePct === 100 ? "green" : typePct >= 75 ? "yellow" : "red"} />
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader title="Player compliance status" />
        {members.length === 0 ? (
          <EmptyState icon={<Shield size={20} />} title="No active players" />
        ) : (
          <div className="space-y-2">
            {memberStatus.map((member) => (
              <div key={String(member.id)} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-surface-1 transition-colors">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${member.pct === 100 ? "bg-green-500" : member.pct >= 50 ? "bg-yellow-500" : "bg-red-500"}`}>
                  {member.pct === 100 ? "✓" : `${member.pct}%`}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{String(member.full_name)}</p>
                  {member.missingWaivers.length > 0 && (
                    <p className="text-xs text-red-500">Missing: {member.missingWaivers.map((k) => WAIVER_TYPES.find((t) => t.key === k)?.label ?? k).join(", ")}</p>
                  )}
                </div>
                <Badge
                  label={member.pct === 100 ? "Compliant" : `${member.missingWaivers.length} missing`}
                  color={member.pct === 100 ? "green" : "red"}
                />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
