"use client";

import { useState, useEffect } from "react";
import {
  BarChart2, Download, FileText, Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Badge, Button, Card, CardHeader, PageHeader, Select, Tabs,
} from "@/components/ui";
import { downloadCsv, formatCurrency, formatDate, orgTypeLabel } from "@/lib/utils";

export default function ReportsPage() {
  const supabase = createClient();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgType, setOrgType] = useState("general_org");
  const [orgName, setOrgName] = useState("");
  const [tab, setTab] = useState("core");
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState("roster");

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: m } = await supabase
        .from("org_members")
        .select("org_id, organizations(name, type)")
        .eq("user_id", user.id)
        .limit(1)
        .single();
      if (m) {
        setOrgId(m.org_id);
        setOrgName(String((m.organizations as Record<string, unknown>)?.name ?? ""));
        setOrgType(String((m.organizations as Record<string, unknown>)?.type ?? "general_org"));
      }
    }
    init();
  }, [supabase]);

  async function runReport() {
    if (!orgId) return;
    setLoading(true);

    try {
      switch (reportType) {
        case "roster": {
          const { data } = await supabase.from("member_profiles").select("*").eq("org_id", orgId).order("full_name");
          downloadCsv(`${orgName}-roster.csv`, (data ?? []).map((m: Record<string, unknown>) => ({
            "Full Name": m.full_name,
            "Preferred Name": m.preferred_name ?? "",
            Email: m.email,
            Phone: m.phone ?? "",
            Role: m.role,
            Status: m.membership_status,
            "Class Year": m.class_year ?? "",
            "Graduation Year": m.graduation_year ?? "",
            Major: m.major ?? "",
            Hometown: m.hometown ?? "",
            "Payment Status": m.payment_status,
            "Attendance %": m.attendance_rate,
            "Forms Completed": `${m.forms_completed}/${m.forms_required}`,
            Committees: Array.isArray(m.committees) ? (m.committees as string[]).join(", ") : "",
            "Emergency Contact": m.emergency_contact_name ?? "",
            "Emergency Phone": m.emergency_contact_phone ?? "",
          })));
          break;
        }
        case "dues": {
          const { data } = await supabase.from("payments").select("*, member_profiles(full_name, email)").eq("org_id", orgId).order("due_date");
          downloadCsv(`${orgName}-dues.csv`, (data ?? []).map((p: Record<string, unknown>) => ({
            Member: (p.member_profiles as Record<string, unknown>)?.full_name ?? "—",
            Email: (p.member_profiles as Record<string, unknown>)?.email ?? "—",
            Amount: p.amount,
            "Paid Amount": p.paid_amount,
            Status: p.status,
            "Due Date": p.due_date ?? "",
            "Paid At": p.paid_at ?? "",
            Method: p.method,
          })));
          break;
        }
        case "attendance": {
          const { data } = await supabase.from("event_rsvps").select("*, events(title, starts_at), member_profiles(full_name)").eq(
            "event_id",
            supabase.from("events").select("id").eq("org_id", orgId)
          );
          downloadCsv(`${orgName}-attendance.csv`, (data ?? []).map((r: Record<string, unknown>) => ({
            Member: (r.member_profiles as Record<string, unknown>)?.full_name ?? "—",
            Event: (r.events as Record<string, unknown>)?.title ?? "—",
            Date: formatDate(String((r.events as Record<string, unknown>)?.starts_at ?? "")),
            RSVP: r.status,
            "Checked In": r.checked_in ? "Yes" : "No",
          })));
          break;
        }
        case "reimbursements": {
          const { data } = await supabase.from("reimbursements").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
          downloadCsv(`${orgName}-reimbursements.csv`, (data ?? []).map((r: Record<string, unknown>) => ({
            Submitter: r.submitted_by_name ?? "—",
            Amount: r.amount,
            Category: r.category,
            Description: r.description,
            Status: r.status,
            "Receipt": r.receipt_url ? "Yes" : "No",
            "Submitted": formatDate(String(r.created_at)),
            "Paid At": r.paid_at ? formatDate(String(r.paid_at)) : "",
          })));
          break;
        }
        case "pnm": {
          const { data } = await supabase.from("pnm_leads").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
          downloadCsv(`${orgName}-pnm.csv`, (data ?? []).map((p: Record<string, unknown>) => ({
            Name: p.full_name,
            Email: p.email ?? "",
            Phone: p.phone ?? "",
            Status: p.status,
            "Class Year": p.class_year ?? "",
            Major: p.major ?? "",
            Hometown: p.hometown ?? "",
            "Referral Source": p.referral_source ?? "",
            "SMS Consent": p.communication_consent ? "Yes" : "No",
            "Opted Out": p.opted_out ? "Yes" : "No",
            Campaign: p.campaign ?? "",
            Tags: Array.isArray(p.tags) ? (p.tags as string[]).join(", ") : "",
            Created: formatDate(String(p.created_at)),
          })));
          break;
        }
        case "alumni": {
          const { data } = await supabase.from("alumni_profiles").select("*").eq("org_id", orgId).order("full_name");
          downloadCsv(`${orgName}-alumni.csv`, (data ?? []).map((a: Record<string, unknown>) => ({
            Name: a.full_name,
            Email: a.email ?? "",
            Phone: a.phone ?? "",
            "Graduation Year": a.graduation_year ?? "",
            "Pledge Class": a.pledge_class ?? "",
            City: a.city ?? "",
            State: a.state ?? "",
            "Career Field": a.career_field ?? "",
            Employer: a.employer ?? "",
            "Giving History": a.giving_history ?? 0,
            "Mentorship Interest": a.mentorship_interest ? "Yes" : "No",
          })));
          break;
        }
        case "budget": {
          const { data: budgets } = await supabase.from("budgets").select("*, budget_lines(*)").eq("org_id", orgId);
          const rows: Record<string, unknown>[] = [];
          (budgets ?? []).forEach((b: Record<string, unknown>) => {
            (b.budget_lines as Record<string, unknown>[]).forEach((l) => {
              rows.push({
                Budget: b.label,
                Category: l.category,
                Type: l.type,
                Description: l.description ?? "",
                Budgeted: l.budgeted,
                Actual: l.actual,
                Variance: Number(l.actual) - Number(l.budgeted),
              });
            });
          });
          downloadCsv(`${orgName}-budget.csv`, rows);
          break;
        }
        case "waivers": {
          const { data } = await supabase.from("sports_waivers").select("*, member_profiles(full_name)").eq("org_id", orgId);
          downloadCsv(`${orgName}-waivers.csv`, (data ?? []).map((w: Record<string, unknown>) => ({
            Member: (w.member_profiles as Record<string, unknown>)?.full_name ?? "—",
            "Waiver Type": String(w.waiver_type).replace(/_/g, " "),
            Status: w.status,
            "Signed At": w.signed_at ? formatDate(String(w.signed_at)) : "",
            "Expires At": w.expires_at ? formatDate(String(w.expires_at)) : "",
          })));
          break;
        }
        case "tasks": {
          const { data } = await supabase.from("tasks").select("*").eq("org_id", orgId).order("due_date");
          downloadCsv(`${orgName}-tasks.csv`, (data ?? []).map((t: Record<string, unknown>) => ({
            Title: t.title,
            Status: t.status,
            Priority: t.priority,
            Assignee: t.assignee_name ?? "",
            "Due Date": t.due_date ? formatDate(String(t.due_date)) : "",
            Tags: Array.isArray(t.tags) ? (t.tags as string[]).join(", ") : "",
            Completed: t.completed_at ? formatDate(String(t.completed_at)) : "",
          })));
          break;
        }
        default:
          break;
      }
    } finally {
      setLoading(false);
    }
  }

  const isGreek = orgType === "fraternity" || orgType === "sorority";
  const isSports = orgType === "club_sports";

  const REPORTS = {
    core: [
      { id: "roster", label: "Roster report", description: "Full member directory with all profile fields, status, and payment info" },
      { id: "dues", label: "Dues report", description: "All payment records with member info, amounts, and statuses" },
      { id: "attendance", label: "Attendance report", description: "Event RSVPs and check-in history for all members" },
      { id: "reimbursements", label: "Reimbursement report", description: "All reimbursement requests with status and amounts" },
      { id: "budget", label: "Budget report", description: "Budget lines with budgeted vs actual amounts and variance" },
      { id: "tasks", label: "Task report", description: "All tasks with status, priority, assignee, and due dates" },
    ],
    greek: [
      { id: "pnm", label: "PNM pipeline report", description: "All PNM leads with status, contact info, and SMS consent" },
      { id: "alumni", label: "Alumni CRM export", description: "Full alumni database with giving history and career info" },
    ],
    sports: [
      { id: "waivers", label: "Waiver completion report", description: "All waiver statuses by member and waiver type" },
    ],
  };

  const visibleReports = [
    ...REPORTS.core,
    ...(isGreek ? REPORTS.greek : []),
    ...(isSports ? REPORTS.sports : []),
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        description={`Export ${orgTypeLabel(orgType)} data as CSV`}
      />

      <Card>
        <CardHeader title="Generate report" icon={<BarChart2 size={16} />} />
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <Select
              label="Report type"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              options={visibleReports.map((r) => ({ value: r.id, label: r.label }))}
            />
          </div>
          <Button
            onClick={runReport}
            loading={loading}
            icon={<Download size={14} />}
            className="flex-shrink-0"
          >
            Export CSV
          </Button>
        </div>
        {visibleReports.find((r) => r.id === reportType)?.description && (
          <p className="text-xs text-muted-foreground mt-2">
            {visibleReports.find((r) => r.id === reportType)?.description}
          </p>
        )}
      </Card>

      <Tabs
        tabs={[
          { id: "core", label: "Core" },
          ...(isGreek ? [{ id: "greek", label: "Greek" }] : []),
          ...(isSports ? [{ id: "sports", label: "Sports" }] : []),
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="grid sm:grid-cols-2 gap-3">
        {(tab === "core" ? REPORTS.core : tab === "greek" ? REPORTS.greek : REPORTS.sports).map((report) => (
          <Card
            key={report.id}
            padding="sm"
            className={`cursor-pointer transition-colors hover:border-greek-300 ${reportType === report.id ? "border-greek-400 bg-greek-50 dark:bg-greek-950/20" : ""}`}
            onClick={() => setReportType(report.id)}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-greek-50 dark:bg-greek-950/30 flex items-center justify-center text-greek-600 flex-shrink-0">
                <FileText size={14} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{report.label}</p>
                  {reportType === report.id && <Badge label="Selected" color="green" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{report.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
