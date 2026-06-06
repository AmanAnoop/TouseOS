export interface ReportRow {
  [key: string]: string | number | boolean | null | undefined;
}

export async function buildUnpaidBalancesReport(orgId: string): Promise<ReportRow[]> {
  const res = await fetch(`/api/payments?org_id=${encodeURIComponent(orgId)}`);
  const data = res.ok ? await res.json() : [];
  return (data as Array<Record<string, unknown>>)
    .filter((p) => ["pending", "partial", "overdue"].includes(String(p.status)))
    .map((p) => ({
      Member: String((p.member_profiles as Record<string, unknown>)?.full_name ?? "—"),
      Email: String((p.member_profiles as Record<string, unknown>)?.email ?? "—"),
      Amount: Number(p.amount),
      Paid: Number(p.paid_amount ?? 0),
      Balance: Number(p.amount) - Number(p.paid_amount ?? 0),
      Status: String(p.status),
      "Due Date": p.due_date ? String(p.due_date) : "",
    }));
}

export async function buildNmeProgressReport(orgId: string): Promise<ReportRow[]> {
  const [modsRes, memRes] = await Promise.all([
    fetch(`/api/nme/modules?org_id=${encodeURIComponent(orgId)}`),
    fetch(`/api/members?org_id=${encodeURIComponent(orgId)}`),
  ]);
  const modsData = modsRes.ok ? await modsRes.json() : { modules: [] };
  const members = memRes.ok ? await memRes.json() : [];
  const requiredIds = new Set(
    ((modsData.modules ?? []) as Array<{ id: string; is_required: boolean }>)
      .filter((m) => m.is_required)
      .map((m) => m.id),
  );
  const requiredTotal = requiredIds.size;

  return (members as Array<Record<string, unknown>>)
    .filter((m) => m.membership_status === "active" || m.membership_status === "new_member")
    .map((m) => ({
      Member: String(m.full_name),
      Email: String(m.email),
      Status: String(m.membership_status),
      "Required modules": requiredTotal,
      Note: requiredTotal > 0 ? "See NME page for per-module progress" : "No required modules",
    }));
}

export async function buildRosterReport(orgId: string, orgName: string): Promise<{ rows: ReportRow[]; filename: string }> {
  const res = await fetch(`/api/members?org_id=${encodeURIComponent(orgId)}`);
  const data = res.ok ? await res.json() : [];
  const rows = (data as Record<string, unknown>[]).map((m) => ({
    "Full Name": String(m.full_name),
    Email: String(m.email),
    Role: String(m.role),
    Status: String(m.membership_status),
    "Class Year": String(m.class_year ?? ""),
    Major: String(m.major ?? ""),
    Hometown: String(m.hometown ?? ""),
    "Payment Status": String(m.payment_status ?? ""),
    "Attendance %": Number(m.attendance_rate ?? 0),
  }));
  return { rows, filename: `${orgName}-roster.csv` };
}

export async function buildDuesReport(orgId: string): Promise<ReportRow[]> {
  const res = await fetch(`/api/payments?org_id=${encodeURIComponent(orgId)}`);
  const data = res.ok ? await res.json() : [];
  return (data as Array<Record<string, unknown>>).map((p) => ({
    Member: String((p.member_profiles as Record<string, unknown>)?.full_name ?? "—"),
    Email: String((p.member_profiles as Record<string, unknown>)?.email ?? "—"),
    Amount: Number(p.amount),
    Paid: Number(p.paid_amount ?? 0),
    Status: String(p.status),
    "Due Date": p.due_date ? String(p.due_date) : "",
    "Paid At": p.paid_at ? String(p.paid_at) : "",
  }));
}

export async function buildTasksReport(orgId: string): Promise<ReportRow[]> {
  const res = await fetch(`/api/tasks?org_id=${encodeURIComponent(orgId)}`);
  const data = res.ok ? await res.json() : [];
  return (data as Array<Record<string, unknown>>).map((t) => ({
    Title: String(t.title),
    Status: String(t.status),
    Priority: String(t.priority),
    Assignee: String(t.assignee_name ?? ""),
    "Due Date": t.due_date ? String(t.due_date) : "",
  }));
}

export async function buildPnmReport(orgId: string): Promise<ReportRow[]> {
  const res = await fetch(`/api/pnm?org_id=${encodeURIComponent(orgId)}`);
  const data = res.ok ? await res.json() : [];
  return (data as Array<Record<string, unknown>>).map((p) => ({
    Name: String(p.full_name),
    Email: String(p.email ?? ""),
    Status: String(p.status),
    "Class Year": String(p.class_year ?? ""),
    Major: String(p.major ?? ""),
    Hometown: String(p.hometown ?? ""),
  }));
}

export async function buildBudgetReport(orgId: string): Promise<ReportRow[]> {
  const res = await fetch(`/api/budget?org_id=${encodeURIComponent(orgId)}`);
  const budgets = res.ok ? await res.json() : [];
  const rows: ReportRow[] = [];
  for (const b of budgets as Array<Record<string, unknown>>) {
    for (const l of (b.budget_lines as Array<Record<string, unknown>>) ?? []) {
      rows.push({
        Budget: String(b.label),
        Category: String(l.category),
        Type: String(l.type),
        Budgeted: Number(l.budgeted),
        Actual: Number(l.actual),
        Variance: Number(l.actual) - Number(l.budgeted),
      });
    }
  }
  return rows;
}

export const REPORT_META: Record<string, { title: string; description: string }> = {
  roster: { title: "Roster", description: "Active members with contact and status fields" },
  "unpaid-balances": { title: "Unpaid balances", description: "Pending, partial, and overdue payment records" },
  "nme-progress": { title: "NME progress", description: "Member education completion overview" },
  dues: { title: "Dues", description: "All payment records with amounts and status" },
  tasks: { title: "Tasks", description: "Open and completed tasks with assignees" },
  pnm: { title: "PNM pipeline", description: "Recruitment leads and status" },
  budget: { title: "Budget", description: "Budget lines with variance" },
  "semester-rewind": { title: "Semester rewind", description: "Term summary metrics" },
};
