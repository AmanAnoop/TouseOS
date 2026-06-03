"use client";

import { useState } from "react";
import {
  BarChart2, Download, FileText,
} from "lucide-react";
import {
  Badge, Button, Card, CardHeader, PageHeader, Select, Tabs,
} from "@/components/ui";
import { downloadCsv, formatDate, orgTypeLabel } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";
import { useOrg } from "@/hooks/use-org";
import { Alert } from "@/components/ui";

export default function ReportsPage() {
  const { can, loading: permLoading } = usePermissions();
  const { orgId, orgName, orgType } = useOrg();
  const [tab, setTab] = useState("core");
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState("roster");

  async function runReport() {
    if (!orgId) return;
    if (!can("view_reports")) return;
    setLoading(true);

    try {
      switch (reportType) {
        case "roster": {
          const rosterRes = await fetch(`/api/members?org_id=${encodeURIComponent(orgId)}`);
          const data = rosterRes.ok ? await rosterRes.json() : [];
          downloadCsv(`${orgName}-roster.csv`, (data as Record<string, unknown>[]).map((m) => ({
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
          const duesRes = await fetch(`/api/payments?org_id=${encodeURIComponent(orgId)}`);
          const data = duesRes.ok ? await duesRes.json() : [];
          downloadCsv(`${orgName}-dues.csv`, (data as Record<string, unknown>[]).map((p) => ({
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
          const evRes = await fetch(`/api/events?org_id=${encodeURIComponent(orgId)}`);
          const orgEvents = evRes.ok ? await evRes.json() : [];
          const eventIds = (orgEvents as Array<{ id: string }>).map((e) => e.id);
          if (eventIds.length === 0) {
            downloadCsv(`${orgName}-attendance.csv`, []);
            break;
          }
          const attRes = await fetch(
            `/api/events/rsvps?org_id=${encodeURIComponent(orgId)}&event_ids=${eventIds.join(",")}&expand=1`,
          );
          const attPayload = attRes.ok ? await attRes.json() : { rsvps: [] };
          downloadCsv(`${orgName}-attendance.csv`, ((attPayload.rsvps ?? []) as Record<string, unknown>[]).map((r) => ({
            Member: (r.member_profiles as Record<string, unknown>)?.full_name ?? "—",
            Event: (r.events as Record<string, unknown>)?.title ?? "—",
            Date: formatDate(String((r.events as Record<string, unknown>)?.starts_at ?? "")),
            RSVP: r.status,
            "Checked In": r.checked_in ? "Yes" : "No",
          })));
          break;
        }
        case "reimbursements": {
          const reimRes = await fetch(`/api/reimbursements?org_id=${encodeURIComponent(orgId)}`);
          const data = reimRes.ok ? await reimRes.json() : [];
          downloadCsv(`${orgName}-reimbursements.csv`, (data as Record<string, unknown>[]).map((r) => ({
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
        case "semester_rewind": {
          const res = await fetch(`/api/reports/semester-rewind?orgId=${orgId}`);
          const data = await res.json();
downloadCsv(`${orgName}-semester-rewind.csv`, [{
            "Total Revenue": data.summary?.totalRevenue,
            "Total Expenses": data.summary?.totalExpenses,
            "Unpaid Balances": data.summary?.unpaidBalances,
            "Avg Attendance %": data.summary?.avgAttendance,
            "Events Hosted": data.summary?.eventsHosted,
            "Task Completion %": data.summary?.taskCompletion,
            "PNM Conversion %": data.summary?.pnmConversion ?? "N/A",
          }]);
          break;
        }
        case "pnm": {
          const pnmRes = await fetch(`/api/pnm?org_id=${encodeURIComponent(orgId)}`);
          const data = pnmRes.ok ? await pnmRes.json() : [];
          downloadCsv(`${orgName}-pnm.csv`, (data as Record<string, unknown>[]).map((p) => ({
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
          const alumRes = await fetch(`/api/alumni?org_id=${encodeURIComponent(orgId)}`);
          const data = alumRes.ok ? await alumRes.json() : [];
          downloadCsv(`${orgName}-alumni.csv`, (data as Record<string, unknown>[]).map((a) => ({
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
          const budgetRes = await fetch(`/api/budget?org_id=${encodeURIComponent(orgId)}`);
          const budgets = budgetRes.ok ? await budgetRes.json() : [];
          const rows: Record<string, unknown>[] = [];
          (budgets as Record<string, unknown>[]).forEach((b) => {
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
          const waiverRes = await fetch(`/api/waivers?org_id=${encodeURIComponent(orgId)}`);
          const data = waiverRes.ok ? await waiverRes.json() : [];
          downloadCsv(`${orgName}-waivers.csv`, (data as Record<string, unknown>[]).map((w) => ({
            Member: (w.member_profiles as Record<string, unknown>)?.full_name ?? "—",
            "Waiver Type": String(w.waiver_type).replace(/_/g, " "),
            Status: w.status,
            "Signed At": w.signed_at ? formatDate(String(w.signed_at)) : "",
            "Expires At": w.expires_at ? formatDate(String(w.expires_at)) : "",
          })));
          break;
        }
        case "tasks": {
          const tasksRes = await fetch(`/api/tasks?org_id=${encodeURIComponent(orgId)}`);
          const data = tasksRes.ok ? await tasksRes.json() : [];
          downloadCsv(`${orgName}-tasks.csv`, (data as Record<string, unknown>[]).map((t) => ({
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

  const canViewReports = !permLoading && can("view_reports");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        description={`Export ${orgTypeLabel(orgType)} data as CSV`}
      />

      {!canViewReports && !permLoading && (
        <Alert type="warning" title="Limited access" description="Officer or advisor roles can export chapter reports. You can still view your own profile data in Account." />
      )}



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
            disabled={!canViewReports}
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
