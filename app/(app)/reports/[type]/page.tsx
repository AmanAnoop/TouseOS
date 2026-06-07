"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { Button, Card, PageHeader } from "@/components/ui";
import { downloadCsv } from "@/lib/utils";
import { useOrg } from "@/hooks/use-org";
import {
  REPORT_META,
  buildBudgetReport,
  buildDuesReport,
  buildPnmReport,
  buildRosterReport,
  buildTasksReport,
  buildUnpaidBalancesReport,
  type ReportRow,
} from "@/lib/report-builders";

async function loadReport(type: string, orgId: string, orgName: string): Promise<ReportRow[]> {
  switch (type) {
    case "roster": {
      const { rows } = await buildRosterReport(orgId, orgName);
      return rows;
    }
    case "unpaid-balances":
      return buildUnpaidBalancesReport(orgId);
    case "dues":
      return buildDuesReport(orgId);
    case "tasks":
      return buildTasksReport(orgId);
    case "pnm":
      return buildPnmReport(orgId);
    case "budget":
      return buildBudgetReport(orgId);
    case "semester-rewind": {
      const res = await fetch(`/api/reports/semester-rewind?orgId=${encodeURIComponent(orgId)}`);
      const data = res.ok ? await res.json() : { summary: {} };
      const s = data.summary ?? {};
      return [{
        "Total Revenue": Number(s.totalRevenue ?? 0),
        "Total Expenses": Number(s.totalExpenses ?? 0),
        "Unpaid Balances": Number(s.unpaidBalances ?? 0),
        "Avg Attendance %": Number(s.avgAttendance ?? 0),
        "Events Hosted": Number(s.eventsHosted ?? 0),
        "Task Completion %": Number(s.taskCompletion ?? 0),
        "PNM Conversion %": s.pnmConversion != null ? Number(s.pnmConversion) : "N/A",
      }];
    }
    case "nme-progress": {
      const res = await fetch(`/api/nme/progress-report?org_id=${encodeURIComponent(orgId)}`);
      const data = res.ok ? await res.json() : { rows: [] };
      return (data.rows ?? []).map((r: Record<string, unknown>) => ({
        Member: String(r.full_name),
        Email: String(r.email),
        "Required done": `${r.required_complete}/${r.required_total}`,
        Complete: r.all_done ? "Yes" : "No",
      }));
    }
    default:
      return [];
  }
}

export default function ReportDetailPage() {
  const params = useParams();
  const type = String(params.type);
  const { orgId, orgName } = useOrg();
  const meta = REPORT_META[type];
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId || !meta) return;
    setLoading(true);
    loadReport(type, orgId, orgName).then((r) => {
      setRows(r);
      setLoading(false);
    });
  }, [orgId, orgName, type, meta]);

  if (!meta) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Unknown report type.</p>
        <Link href="/reports" className="text-greek-600 text-sm hover:underline">← Back to reports</Link>
      </div>
    );
  }

  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="ds-page-stack">
      <Link href="/reports" className="inline-flex items-center gap-1 text-sm text-greek-600 hover:underline">
        <ArrowLeft size={14} /> All reports
      </Link>
      <PageHeader
        title={meta.title}
        description={meta.description}
        action={
          <Button
            size="sm"
            icon={<Download size={14} />}
            disabled={rows.length === 0}
            onClick={() => downloadCsv(`${orgName}-${type}.csv`, rows)}
          >
            Export CSV
          </Button>
        }
      />
      <Card padding="none">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading preview…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No data for this report.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-1">
                  {headers.map((h) => (
                    <th key={h} className="text-left px-4 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((row, i) => (
                  <tr key={i} className="border-b border-border hover:bg-surface-1">
                    {headers.map((h) => (
                      <td key={h} className="px-4 py-2 whitespace-nowrap">{String(row[h] ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 50 && (
              <p className="text-xs text-muted-foreground p-3 border-t border-border">
                Showing 50 of {rows.length} rows. Export CSV for the full dataset.
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
