export interface BudgetExportLine {
  category: string;
  type: "income" | "expense";
  description: string | null;
  budgeted: number;
  actual: number;
}

export interface BudgetExportData {
  orgName: string;
  label: string;
  period: string;
  fiscalYear: number | null;
  generatedAt: string;
  lines: BudgetExportLine[];
  totalBudgetedIncome: number;
  totalActualIncome: number;
  totalBudgetedExpense: number;
  totalActualExpense: number;
  netActual: number;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function buildBudgetReportHtml(data: BudgetExportData): string {
  const rows = data.lines
    .map((l) => {
      const variance = Number(l.actual) - Number(l.budgeted);
      return `<tr>
        <td>${escapeHtml(l.category)}</td>
        <td>${escapeHtml(l.type)}</td>
        <td>${escapeHtml(l.description ?? "—")}</td>
        <td class="num">${money(Number(l.budgeted))}</td>
        <td class="num">${money(Number(l.actual))}</td>
        <td class="num ${variance >= 0 ? "pos" : "neg"}">${money(variance)}</td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(data.label)} — Budget Report</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem; color: #111; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    .meta { color: #555; font-size: 0.9rem; margin-bottom: 1.5rem; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .summary div { background: #f4f4f5; border-radius: 8px; padding: 0.75rem 1rem; }
    .summary p { margin: 0; font-size: 0.75rem; color: #666; }
    .summary strong { font-size: 1.1rem; display: block; margin-top: 0.25rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    th, td { border-bottom: 1px solid #e4e4e7; padding: 0.5rem 0.75rem; text-align: left; }
    th { background: #fafafa; font-weight: 600; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .pos { color: #15803d; }
    .neg { color: #b91c1c; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(data.orgName)}</h1>
  <p class="meta">${escapeHtml(data.label)} · ${escapeHtml(data.period)}${data.fiscalYear ? ` · FY ${data.fiscalYear}` : ""}<br />
  Generated ${escapeHtml(new Date(data.generatedAt).toLocaleString())}</p>
  <div class="summary">
    <div><p>Income (actual)</p><strong>${money(data.totalActualIncome)}</strong></div>
    <div><p>Expenses (actual)</p><strong>${money(data.totalActualExpense)}</strong></div>
    <div><p>Net</p><strong class="${data.netActual >= 0 ? "pos" : "neg"}">${money(data.netActual)}</strong></div>
    <div><p>Budgeted expenses</p><strong>${money(data.totalBudgetedExpense)}</strong></div>
  </div>
  <table>
    <thead>
      <tr><th>Category</th><th>Type</th><th>Description</th><th class="num">Budgeted</th><th class="num">Actual</th><th class="num">Variance</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="meta" style="margin-top:2rem;">Exported from TouseOS</p>
</body>
</html>`;
}

export function downloadBudgetReportHtml(filename: string, html: string): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
