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

export const REPORT_META: Record<string, { title: string; description: string }> = {
  roster: { title: "Roster", description: "Active members with contact and status fields" },
  "unpaid-balances": { title: "Unpaid balances", description: "Pending, partial, and overdue payment records" },
  "nme-progress": { title: "NME progress", description: "Member education completion overview" },
};
