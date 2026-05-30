import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, PageHeader, ProgressBar, StatCard } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { BookOpen, DollarSign, TrendingDown, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "Budget & Finance" };

export default async function BudgetPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: m } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single();
  if (!m) redirect("/onboarding");

  const [budgetsRes, paymentsRes, reimbursementsRes] = await Promise.all([
    supabase.from("budgets").select("*, budget_lines(*)").eq("org_id", m.org_id).limit(5),
    supabase.from("payments").select("amount, paid_amount, status").eq("org_id", m.org_id),
    supabase.from("reimbursements").select("amount, status").eq("org_id", m.org_id),
  ]);

  const payments = paymentsRes.data ?? [];
  const reimbursements = reimbursementsRes.data ?? [];
  const budgets = budgetsRes.data ?? [];

  const totalIncome = payments.reduce((s, p) => s + Number(p.paid_amount), 0);
  const totalExpenses = reimbursements.filter((r) => r.status === "paid").reduce((s, r) => s + Number(r.amount), 0);
  const pendingReimbursements = reimbursements.filter((r) => r.status === "submitted" || r.status === "needs_info");

  return (
    <div className="space-y-6">
      <PageHeader title="Budget & Finance" description="Track income, expenses, and reimbursements" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total income" value={formatCurrency(totalIncome)} deltaType="up" icon={<TrendingUp size={18} />} />
        <StatCard title="Total expenses" value={formatCurrency(totalExpenses)} deltaType="neutral" icon={<TrendingDown size={18} />} />
        <StatCard title="Net balance" value={formatCurrency(totalIncome - totalExpenses)} deltaType={totalIncome > totalExpenses ? "up" : "down"} icon={<DollarSign size={18} />} />
        <StatCard title="Pending reimb." value={pendingReimbursements.length} icon={<BookOpen size={18} />} />
      </div>

      {budgets.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold">Active budgets</h2>
          {budgets.map((b: Record<string, unknown>) => {
            const lines = (b.budget_lines as Array<Record<string, unknown>>) ?? [];
            const income = lines.filter((l) => l.type === "income").reduce((s, l) => s + Number(l.actual), 0);
            const expenses = lines.filter((l) => l.type === "expense").reduce((s, l) => s + Number(l.actual), 0);
            const budgetTotal = Number(b.total_budget);
            const pct = budgetTotal > 0 ? Math.round((expenses / budgetTotal) * 100) : 0;
            return (
              <Card key={String(b.id)}>
                <CardHeader title={String(b.label)} description={`${String(b.period)} budget`} />
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div><p className="text-xs text-muted-foreground">Budget</p><p className="font-semibold">{formatCurrency(budgetTotal)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Income</p><p className="font-semibold text-green-600">{formatCurrency(income)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Expenses</p><p className="font-semibold text-red-500">{formatCurrency(expenses)}</p></div>
                </div>
                <ProgressBar value={pct} label={`${pct}% of budget used`} color={pct > 90 ? "red" : pct > 70 ? "yellow" : "green"} size="md" />
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader title="Budget categories" description="Budgeted vs actual this semester" />
        <div className="space-y-3">
          {[
            { label: "Dues income", budgeted: totalIncome * 1.1, actual: totalIncome, type: "income" },
            { label: "Event expenses", budgeted: totalExpenses * 1.2, actual: totalExpenses, type: "expense" },
            { label: "National dues", budgeted: 3000, actual: 2800, type: "expense" },
            { label: "Philanthropy", budgeted: 1500, actual: 900, type: "expense" },
            { label: "Recruitment", budgeted: 2000, actual: 1400, type: "expense" },
          ].map((row) => {
            const pct = row.budgeted > 0 ? Math.round((row.actual / row.budgeted) * 100) : 0;
            return (
              <div key={row.label} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${row.type === "income" ? "bg-green-500" : "bg-red-400"}`} />
                <span className="text-sm text-muted-foreground w-32 flex-shrink-0">{row.label}</span>
                <div className="flex-1">
                  <ProgressBar value={pct} color={pct > 100 ? "red" : pct > 80 ? "yellow" : "green"} />
                </div>
                <span className="text-xs text-muted-foreground w-24 text-right flex-shrink-0">
                  {formatCurrency(row.actual)} / {formatCurrency(row.budgeted)}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
