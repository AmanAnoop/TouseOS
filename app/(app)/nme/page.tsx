import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Badge, Card, CardHeader, EmptyState, PageHeader, ProgressBar, StatCard,
} from "@/components/ui";
import { BookOpen, CheckCircle2, Users } from "lucide-react";
import { NmeSeedButton } from "@/components/nme/nme-seed-button";

export const metadata = { title: "New Member Education" };
export const dynamic = "force-dynamic";

export default async function NmePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: m } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single();
  if (!m) redirect("/onboarding");

  const [modulesRes, newMembersRes, progressRes] = await Promise.all([
    supabase.from("nme_modules").select("*").eq("org_id", m.org_id).order("order_index"),
    supabase.from("member_profiles").select("id, full_name, profile_photo_url, membership_status").eq("org_id", m.org_id).eq("membership_status", "active"),
    supabase.from("nme_progress").select("module_id, member_id, completed, score").eq("org_id", m.org_id),
  ]);

  const modules = (modulesRes.data ?? []) as Array<Record<string, unknown>>;
  const members = (newMembersRes.data ?? []) as Array<Record<string, unknown>>;
  const progress = (progressRes.data ?? []) as Array<Record<string, unknown>>;

  const totalRequired = modules.filter((mod) => mod.is_required).length;

  const memberProgress: Array<Record<string, unknown> & { completed: number; pct: number }> = members.map((member) => {
    const memberProg = progress.filter((p) => p.member_id === member.id);
    const completed = memberProg.filter((p) => p.completed).length;
    const pct = totalRequired > 0 ? Math.round((completed / totalRequired) * 100) : 100;
    return { ...member, completed, pct };
  });

  const fullyComplete = memberProgress.filter((m) => m.pct === 100).length;

  const DEFAULT_MODULES = [
    { title: "Anti-hazing acknowledgement", description: "Read and sign the anti-hazing policy", required: true },
    { title: "Chapter values & history", description: "Learn our founding principles and chapter history", required: true },
    { title: "Risk management overview", description: "Understand chapter risk policies and procedures", required: true },
    { title: "Member responsibilities", description: "Dues, attendance expectations, and officer roles", required: true },
    { title: "Financial policies", description: "How dues and chapter finances work", required: true },
    { title: "Social media guidelines", description: "Chapter brand standards and content policies", required: false },
    { title: "Big/little program intro", description: "How matching works and what to expect", required: false },
    { title: "Community values quiz", description: "Test your knowledge of chapter values", required: true },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="New Member Education"
        description="Track module completion, quizzes, and anti-hazing acknowledgements"
        action={<NmeSeedButton orgId={m.org_id} moduleCount={modules.length} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="New members" value={members.length} icon={<Users size={18} />} />
        <StatCard title="Modules" value={modules.length || DEFAULT_MODULES.length} icon={<BookOpen size={18} />} />
        <StatCard title="Fully complete" value={fullyComplete} deltaType={fullyComplete === members.length ? "up" : "neutral"} icon={<CheckCircle2 size={18} />} />
        <StatCard title="Completion rate" value={members.length > 0 ? `${Math.round((fullyComplete / members.length) * 100)}%` : "—"} icon={<CheckCircle2 size={18} />} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Module checklist */}
        <Card>
          <CardHeader
            title="Education modules"
            description={`${modules.length || DEFAULT_MODULES.length} total · ${totalRequired || DEFAULT_MODULES.filter((m) => m.required).length} required`}
          />
          <div className="space-y-2">
            {(modules.length > 0 ? modules : DEFAULT_MODULES.map((m, i) => ({ ...m, id: String(i), is_required: m.required, order_index: i }))).map((mod: Record<string, unknown>) => (
              <div key={String(mod.id)} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-surface-1 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${mod.is_required ? "bg-racing-50 text-racing" : "bg-surface-2 text-muted-foreground"}`}>
                  <BookOpen size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{String(mod.title)}</p>
                    {Boolean(mod.is_required)&& <Badge label="Required" color="green" />}
                  </div>
                  {Boolean(mod.description)&& <p className="text-xs text-muted-foreground mt-0.5">{String(mod.description)}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Member progress */}
        <Card>
          <CardHeader title="Member progress" description={`${fullyComplete}/${members.length} complete`} />
          {members.length === 0 ? (
            <EmptyState icon={<Users size={20} />} title="No new members" description="Add new members to track their education progress." />
          ) : (
            <div className="space-y-3">
              {memberProgress.slice(0, 10).map((member) => (
                <div key={String(member.id)}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{String(member.full_name)}</span>
                    <span className={`text-xs font-medium ${member.pct === 100 ? "text-green-600" : member.pct >= 50 ? "text-yellow-600" : "text-red-500"}`}>
                      {member.pct}%
                    </span>
                  </div>
                  <ProgressBar
                    value={member.pct}
                    color={member.pct === 100 ? "green" : member.pct >= 50 ? "yellow" : "red"}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Anti-hazing compliance" description="Every new member must acknowledge the anti-hazing policy" />
        <div className="p-4 rounded-xl bg-green-50 border border-green-200">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-green-800">Anti-hazing acknowledgement active</p>
              <p className="text-xs text-green-700 mt-1">
                All new members are required to read and electronically sign the anti-hazing acknowledgement
                before participating in any chapter activities. Records are stored and available for advisor review.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
