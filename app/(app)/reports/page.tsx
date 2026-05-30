import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge, Button, Card, CardHeader, PageHeader, StatCard } from "@/components/ui";
import { downloadCsv, formatCurrency, formatDate } from "@/lib/utils";
import { Download, FileText } from "lucide-react";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: m } = await supabase.from("org_members").select("org_id, organizations(name, type)").eq("user_id", user.id).limit(1).single();
  if (!m) redirect("/onboarding");

  const orgId = m.org_id;
  const org = m.organizations as Record<string, unknown>;

  const [membersRes, paymentsRes, eventsRes, pnmRes] = await Promise.all([
    supabase.from("member_profiles").select("*").eq("org_id", orgId),
    supabase.from("payments").select("*, member_profiles(full_name, email)").eq("org_id", orgId),
    supabase.from("events").select("id, title, starts_at, type").eq("org_id", orgId).order("starts_at", { ascending: false }).limit(20),
    supabase.from("pnm_leads").select("id, status, created_at").eq("org_id", orgId),
  ]);

  const members = membersRes.data ?? [];
  const payments = paymentsRes.data ?? [];
  const events = eventsRes.data ?? [];
  const pnms = pnmRes.data ?? [];

  const orgType = String(org.type ?? "general_org");
  const isGreek = orgType === "fraternity" || orgType === "sorority";

  const REPORTS = [
    {
      id: "roster",
      title: "Roster report",
      description: `${members.length} members across all statuses`,
      category: "Core",
      data: () => members.map((m: Record<string, unknown>) => ({
        Name: m.full_name,
        Email: m.email,
        Role: m.role,
        Status: m.membership_status,
        "Class Year": m.class_year ?? "",
        Major: m.major ?? "",
        "Payment Status": m.payment_status,
        "Attendance %": m.attendance_rate,
      })),
      filename: "roster-report.csv",
    },
    {
      id: "dues",
      title: "Dues report",
      description: `${payments.length} payment records`,
      category: "Finance",
      data: () => payments.map((p: Record<string, unknown>) => ({
        Member: (p.member_profiles as Record<string, unknown>)?.full_name ?? "—",
        Email: (p.member_profiles as Record<string, unknown>)?.email ?? "—",
        Amount: p.amount,
        "Paid Amount": p.paid_amount,
        Status: p.status,
        "Due Date": p.due_date ?? "",
        Method: p.method,
      })),
      filename: "dues-report.csv",
    },
    {
      id: "events",
      title: "Events report",
      description: `${events.length} events`,
      category: "Core",
      data: () => events.map((e: Record<string, unknown>) => ({
        Title: e.title,
        Type: e.type,
        Date: formatDate(String(e.starts_at)),
      })),
      filename: "events-report.csv",
    },
    ...(isGreek ? [{
      id: "pnm",
      title: "PNM pipeline report",
      description: `${pnms.length} recruitment leads`,
      category: "Greek",
      data: () => pnms.map((p: Record<string, unknown>) => ({
        Status: p.status,
        "Created At": formatDate(String(p.created_at)),
      })),
      filename: "pnm-report.csv",
    }] : []),
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        description="Export roster, finance, attendance, and recruitment reports"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {REPORTS.map((report) => (
          <Card key={report.id}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-greek-50 dark:bg-greek-950/30 flex items-center justify-center text-greek-600 flex-shrink-0">
                <FileText size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{report.title}</p>
                  <Badge label={report.category} color={report.category === "Finance" ? "blue" : report.category === "Greek" ? "purple" : "gray"} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{report.description}</p>
              </div>
            </div>
            <form action={async () => {
              "use server";
              // Client-side export triggered from client
            }}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<Download size={14} />}
                className="mt-3 w-full"
              >
                Export CSV
              </Button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}
