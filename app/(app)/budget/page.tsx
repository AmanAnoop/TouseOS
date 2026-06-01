"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BookOpen, DollarSign, Download, Plus,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import {
  Button, Card, EmptyState,
  Input, Modal, PageHeader, Select, Tabs,
} from "@/components/ui";
import { downloadCsv, formatCurrency } from "@/lib/utils";
import { computeBudgetAlerts } from "@/lib/budget-alerts";
import { BudgetAlerts } from "@/components/budget/budget-alerts";
import { BudgetOverview } from "@/components/budget/budget-overview";
import { CashFlowForecastPanel } from "@/components/budget/cash-flow-forecast";
import { computeCashFlowForecast } from "@/lib/cash-flow-forecast";
import { DuesForecastPanel } from "@/components/budget/dues-forecast-panel";
import { computeDuesForecast, computeDuesSyncActual, type PaymentSummary } from "@/lib/dues-forecast";
import { BudgetLineTable } from "@/components/budget/budget-line-table";
import { can, type RoleName } from "@/lib/permissions";
import { computeReimbursementAgingAlerts } from "@/lib/reimbursement-aging";
import { buildBudgetReportHtml, downloadBudgetReportHtml } from "@/lib/budget-export";
import { Alert } from "@/components/ui";

interface BudgetLine {
  id: string;
  budget_id: string;
  category: string;
  type: "income" | "expense";
  description: string | null;
  budgeted: number;
  actual: number;
}

interface Budget {
  id: string;
  label: string;
  period: string;
  fiscal_year: number | null;
  semester: string | null;
  total_budget: number;
  notes: string | null;
  budget_lines: BudgetLine[];
}

const INCOME_CATEGORIES = ["Dues income","Event income","Donations","Merchandise income","Sponsorship income","Other income"];
const EXPENSE_CATEGORIES = ["National dues","Venue expense","Food & catering","Transportation","Security","Hotel","Equipment","Philanthropy","Social events","Recruitment","Technology","Printing","Miscellaneous"];

export default function BudgetPage() {
  const supabase = createClient();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<RoleName>("general_member");
  const [orgName, setOrgName] = useState("Chapter");
  const [reimbs, setReimbs] = useState<Array<{ id: string; amount: number; status: string; created_at: string; submitted_by_name: string | null; category: string }>>([]);
  const [payments, setPayments] = useState<PaymentSummary[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [tab, setTab] = useState("overview");
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [createBudgetOpen, setCreateBudgetOpen] = useState(false);
  const [addLineOpen, setAddLineOpen] = useState(false);

  const [budgetForm, setBudgetForm] = useState({
    label: "", period: "semester", fiscalYear: String(new Date().getFullYear()),
    semester: "fall", totalBudget: "",
  });
  const [lineForm, setLineForm] = useState({
    category: "Dues income", type: "income" as "income" | "expense",
    description: "", budgeted: "", actual: "0",
  });

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const [budgetRes, paymentsRes, reimbRes] = await Promise.all([
      fetch(`/api/budget?org_id=${oid}`),
      supabase.from("payments").select("id, amount, paid_amount, status, due_date, category").eq("org_id", oid),
      supabase.from("reimbursements").select("id, amount, status, created_at, submitted_by_name, category").eq("org_id", oid),
    ]);
    if (budgetRes.ok) {
      const data = await budgetRes.json();
      setBudgets(data);
      if (data.length > 0) setSelectedBudget(data[0]);
    }
    setPayments((paymentsRes.data ?? []) as PaymentSummary[]);
    setReimbs((reimbRes.data ?? []) as typeof reimbs);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: m } = await supabase.from("org_members").select("org_id, role, organizations(name)").eq("user_id", user.id).limit(1).single();
      if (m) {
        setOrgId(m.org_id);
        setMyRole(String(m.role ?? "general_member") as RoleName);
        setOrgName(String(((m.organizations as unknown) as Record<string, unknown>)?.name ?? "Chapter"));
        load(m.org_id);
      }
    }
    init();
  }, [supabase, load]);

  async function createBudget() {
    if (!orgId || !budgetForm.label) return;
    const res = await fetch("/api/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        label: budgetForm.label,
        period: budgetForm.period,
        fiscalYear: parseInt(budgetForm.fiscalYear),
        semester: budgetForm.semester || null,
        totalBudget: parseFloat(budgetForm.totalBudget || "0"),
      }),
    });
    if (res.ok) {
      toast.success("Budget created");
      setCreateBudgetOpen(false);
      setBudgetForm({ label: "", period: "semester", fiscalYear: String(new Date().getFullYear()), semester: "fall", totalBudget: "" });
      load(orgId);
    } else toast.error("Failed to create budget");
  }

  async function addLine() {
    if (!selectedBudget || !lineForm.category) return;
    const { data, error } = await supabase.from("budget_lines").insert({
      budget_id: selectedBudget.id,
      category: lineForm.category,
      type: lineForm.type,
      description: lineForm.description || null,
      budgeted: parseFloat(lineForm.budgeted || "0"),
      actual: parseFloat(lineForm.actual || "0"),
    }).select().single();

    if (error) { toast.error(error.message); return; }
    const newLine = data as BudgetLine;
    setSelectedBudget((prev) => prev ? { ...prev, budget_lines: [...prev.budget_lines, newLine] } : prev);
    setBudgets((prev) => prev.map((b) => b.id === selectedBudget.id ? { ...b, budget_lines: [...b.budget_lines, newLine] } : b));
    toast.success("Line added");
    setAddLineOpen(false);
    setLineForm({ category: "Dues income", type: "income", description: "", budgeted: "", actual: "0" });
  }

  async function updateActual(lineId: string, actual: number) {
    await supabase.from("budget_lines").update({ actual }).eq("id", lineId);
    setSelectedBudget((prev) => prev ? {
      ...prev,
      budget_lines: prev.budget_lines.map((l) => l.id === lineId ? { ...l, actual } : l),
    } : prev);
  }

  async function updateBudgeted(lineId: string, budgeted: number) {
    await supabase.from("budget_lines").update({ budgeted }).eq("id", lineId);
    setSelectedBudget((prev) => prev ? {
      ...prev,
      budget_lines: prev.budget_lines.map((l) => l.id === lineId ? { ...l, budgeted } : l),
    } : prev);
  }

  async function deleteLine(lineId: string) {
    await supabase.from("budget_lines").delete().eq("id", lineId);
    setSelectedBudget((prev) => prev ? { ...prev, budget_lines: prev.budget_lines.filter((l) => l.id !== lineId) } : prev);
  }


  async function syncDuesToBudget() {
    if (!selectedBudget || !orgId) return;
    setSyncing(true);
    const collected = computeDuesSyncActual(payments);
    let duesLine = selectedBudget.budget_lines.find((l) => l.type === "income" && l.category === "Dues income");

    if (!duesLine) {
      const { data, error } = await supabase.from("budget_lines").insert({
        budget_id: selectedBudget.id,
        category: "Dues income",
        type: "income",
        description: "Synced from Payments",
        budgeted: collected,
        actual: collected,
      }).select().single();
      if (error) { toast.error(error.message); setSyncing(false); return; }
      duesLine = data as BudgetLine;
      setSelectedBudget((prev) => prev ? { ...prev, budget_lines: [...prev.budget_lines, duesLine!] } : prev);
    } else {
      await supabase.from("budget_lines").update({ actual: collected }).eq("id", duesLine.id);
      setSelectedBudget((prev) => prev ? {
        ...prev,
        budget_lines: prev.budget_lines.map((l) => l.id === duesLine!.id ? { ...l, actual: collected } : l),
      } : prev);
    }
    setBudgets((prev) => prev.map((b) => b.id === selectedBudget.id ? {
      ...b,
      budget_lines: b.budget_lines.some((l) => l.id === duesLine!.id)
        ? b.budget_lines.map((l) => l.id === duesLine!.id ? { ...l, actual: collected } : l)
        : [...b.budget_lines, duesLine!],
    } : b));
    setSyncing(false);
    toast.success(`Synced $${collected.toFixed(2)} collected dues to budget`);
  }

  function exportBudget() {
    if (!selectedBudget) return;
    downloadCsv(`budget-${selectedBudget.label}.csv`, selectedBudget.budget_lines.map((l) => ({
      Category: l.category,
      Type: l.type,
      Description: l.description ?? "",
      Budgeted: l.budgeted,
      Actual: l.actual,
      Variance: l.actual - l.budgeted,
    })));
  }

  function exportBudgetHtml() {
    if (!selectedBudget) return;
    const html = buildBudgetReportHtml({
      orgName,
      label: selectedBudget.label,
      period: selectedBudget.period,
      fiscalYear: selectedBudget.fiscal_year,
      generatedAt: new Date().toISOString(),
      lines: selectedBudget.budget_lines,
      totalBudgetedIncome,
      totalActualIncome,
      totalBudgetedExpense,
      totalActualExpense,
      netActual,
    });
    downloadBudgetReportHtml(`budget-${selectedBudget.label}.html`, html);
    toast.success("Budget report downloaded — open in browser and Print to PDF");
  }

  const lines = selectedBudget?.budget_lines ?? [];
  const incomeLines = lines.filter((l) => l.type === "income");
  const expenseLines = lines.filter((l) => l.type === "expense");
  const totalBudgetedIncome = incomeLines.reduce((s, l) => s + Number(l.budgeted), 0);
  const totalActualIncome = incomeLines.reduce((s, l) => s + Number(l.actual), 0);
  const totalBudgetedExpense = expenseLines.reduce((s, l) => s + Number(l.budgeted), 0);
  const totalActualExpense = expenseLines.reduce((s, l) => s + Number(l.actual), 0);
  const netActual = totalActualIncome - totalActualExpense;
  const budgetUsedPct = totalBudgetedExpense > 0 ? Math.round((totalActualExpense / totalBudgetedExpense) * 100) : 0;
  const canViewBudget = can(myRole, "manage_budget") || can(myRole, "view_payments") || can(myRole, "manage_payments");
  const canEditBudget = can(myRole, "manage_budget");
  const reimbAgingAlerts = computeReimbursementAgingAlerts(reimbs);
  const alerts = [...computeBudgetAlerts(lines), ...reimbAgingAlerts.map((a) => ({
    id: a.id,
    severity: a.severity,
    title: a.title,
    message: a.message,
  }))];
  const cashFlowForecast = computeCashFlowForecast(lines);
  const duesForecast = computeDuesForecast(payments);

  if (!loading && !canViewBudget) {
    return (
      <div className="space-y-5">
        <PageHeader title="Budget & Finance" description="Restricted" />
        <Alert type="warning" title="Access restricted" description="You need treasurer or officer budget permissions to view this page." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Budget alerts computed client-side from lines */}
      <PageHeader
        title="Budget & Finance"
        description={selectedBudget ? selectedBudget.label : "No budgets yet"}
        action={
          <div className="flex gap-2">
            {selectedBudget && (
              <>
                <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={exportBudget}>CSV</Button>
                <Button variant="secondary" size="sm" onClick={exportBudgetHtml}>Report (HTML)</Button>
              </>
            )}
            {canEditBudget && <Button size="sm" icon={<Plus size={14} />} onClick={() => setCreateBudgetOpen(true)}>New budget</Button>}
          </div>
        }
      />

      {/* Budget switcher */}
      {budgets.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {budgets.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBudget(b)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedBudget?.id === b.id ? "bg-greek-600 text-white" : "bg-surface-1 text-muted-foreground hover:text-foreground"}`}
            >
              {b.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1,2,3,4].map((i) => <Card key={i} className="h-24 animate-pulse bg-surface-2 border-0">&nbsp;</Card>)}
        </div>
      ) : !selectedBudget ? (
        <EmptyState
          icon={<BookOpen size={24} />}
          title="No budgets yet"
          description="Create your first budget to track chapter finances."
          action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setCreateBudgetOpen(true)}>Create budget</Button>}
        />
      ) : (
        <>
          <BudgetAlerts alerts={alerts} />
          <BudgetOverview
            totalActualIncome={totalActualIncome}
            totalBudgetedIncome={totalBudgetedIncome}
            totalActualExpense={totalActualExpense}
            totalBudgetedExpense={totalBudgetedExpense}
            netActual={netActual}
            budgetUsedPct={budgetUsedPct}
          />

          <Tabs
            tabs={[
              { id: "overview", label: "Overview" },
              { id: "forecast", label: "Cash flow" },
              { id: "dues", label: "Dues forecast" },
              { id: "income", label: "Income", count: incomeLines.length },
              { id: "expense", label: "Expenses", count: expenseLines.length },
            ]}
            active={tab}
            onChange={setTab}
          />

          {tab === "forecast" ? (
            <CashFlowForecastPanel forecast={cashFlowForecast} />
          ) : tab === "dues" ? (
            <DuesForecastPanel forecast={duesForecast} onSyncToBudget={syncDuesToBudget} syncing={syncing} />
          ) : (
          <>
          <div className="flex justify-end">
            <Button size="sm" icon={<Plus size={14} />} onClick={() => { setLineForm({ ...lineForm, type: tab === "income" ? "income" : "expense" }); setAddLineOpen(true); }}>
              Add line item
            </Button>
          </div>

          {(tab === "overview" ? lines : tab === "income" ? incomeLines : expenseLines).length === 0 ? (
            <EmptyState icon={<DollarSign size={20} />} title="No line items" action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setAddLineOpen(true)}>Add first line</Button>} />
          ) : (
            <BudgetLineTable
              lines={tab === "overview" ? lines : tab === "income" ? incomeLines : expenseLines}
              showType={tab === "overview"}
              onUpdateBudgeted={updateBudgeted}
              onUpdateActual={updateActual}
              onDelete={deleteLine}
              totals={{
                budgetedLabel: tab === "overview" ? `+${formatCurrency(totalBudgetedIncome)} / -${formatCurrency(totalBudgetedExpense)}` :
                  tab === "income" ? formatCurrency(totalBudgetedIncome) : formatCurrency(totalBudgetedExpense),
                actualLabel: tab === "overview" ? `+${formatCurrency(totalActualIncome)} / -${formatCurrency(totalActualExpense)}` :
                  tab === "income" ? formatCurrency(totalActualIncome) : formatCurrency(totalActualExpense),
                varianceLabel: tab === "overview" ? formatCurrency(netActual) :
                  tab === "income" ? formatCurrency(totalActualIncome - totalBudgetedIncome) :
                  formatCurrency(totalActualExpense - totalBudgetedExpense),
              }}
            />
          )}
          </>
          )}
        </>
      )}

      {/* Create budget modal */}
      <Modal open={createBudgetOpen} onClose={() => setCreateBudgetOpen(false)} title="Create budget"
        footer={<><Button variant="secondary" onClick={() => setCreateBudgetOpen(false)}>Cancel</Button><Button onClick={createBudget} disabled={!budgetForm.label}>Create</Button></>}
      >
        <div className="space-y-4">
          <Input label="Budget label *" placeholder="Fall 2025 Chapter Budget" value={budgetForm.label} onChange={(e) => setBudgetForm({ ...budgetForm, label: e.target.value })} />
          <div className="grid sm:grid-cols-2 gap-3">
            <Select label="Period" value={budgetForm.period} onChange={(e) => setBudgetForm({ ...budgetForm, period: e.target.value })} options={[{ value: "annual", label: "Annual" }, { value: "semester", label: "Semester" }, { value: "event", label: "Event-specific" }]} />
            <Select label="Semester" value={budgetForm.semester} onChange={(e) => setBudgetForm({ ...budgetForm, semester: e.target.value })} options={[{ value: "fall", label: "Fall" }, { value: "spring", label: "Spring" }]} />
            <Input label="Fiscal year" type="number" value={budgetForm.fiscalYear} onChange={(e) => setBudgetForm({ ...budgetForm, fiscalYear: e.target.value })} />
            <Input label="Total budget ($)" type="number" placeholder="20000" value={budgetForm.totalBudget} onChange={(e) => setBudgetForm({ ...budgetForm, totalBudget: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* Add line modal */}
      <Modal open={addLineOpen} onClose={() => setAddLineOpen(false)} title="Add budget line"
        footer={<><Button variant="secondary" onClick={() => setAddLineOpen(false)}>Cancel</Button><Button onClick={addLine}>Add</Button></>}
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            {(["income","expense"] as const).map((t) => (
              <button key={t} onClick={() => { setLineForm({ ...lineForm, type: t, category: t === "income" ? "Dues income" : "Venue expense" }); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${lineForm.type === t ? (t === "income" ? "bg-green-600 text-white border-green-600" : "bg-red-600 text-white border-red-600") : "border-border text-muted-foreground"}`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <Select label="Category" value={lineForm.category} onChange={(e) => setLineForm({ ...lineForm, category: e.target.value })} options={(lineForm.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => ({ value: c, label: c }))} />
          <Input label="Description (optional)" value={lineForm.description} onChange={(e) => setLineForm({ ...lineForm, description: e.target.value })} placeholder="Details..." />
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Budgeted amount ($)" type="number" value={lineForm.budgeted} onChange={(e) => setLineForm({ ...lineForm, budgeted: e.target.value })} placeholder="0.00" />
            <Input label="Actual amount ($)" type="number" value={lineForm.actual} onChange={(e) => setLineForm({ ...lineForm, actual: e.target.value })} placeholder="0.00" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
