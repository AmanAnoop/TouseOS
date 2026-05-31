"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BookOpen, DollarSign, Download, Plus, Trash2, TrendingDown, TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import {
  Badge, Button, Card, CardHeader, EmptyState,
  Input, Modal, PageHeader, ProgressBar, Select, StatCard, Tabs,
} from "@/components/ui";
import { downloadCsv, formatCurrency } from "@/lib/utils";

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
    const res = await fetch(`/api/budget?org_id=${oid}`);
    if (res.ok) {
      const data = await res.json();
      setBudgets(data);
      if (data.length > 0) setSelectedBudget(data[0]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: m } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single();
      if (m) { setOrgId(m.org_id); load(m.org_id); }
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

  async function deleteLine(lineId: string) {
    await supabase.from("budget_lines").delete().eq("id", lineId);
    setSelectedBudget((prev) => prev ? { ...prev, budget_lines: prev.budget_lines.filter((l) => l.id !== lineId) } : prev);
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

  const lines = selectedBudget?.budget_lines ?? [];
  const incomeLines = lines.filter((l) => l.type === "income");
  const expenseLines = lines.filter((l) => l.type === "expense");
  const totalBudgetedIncome = incomeLines.reduce((s, l) => s + Number(l.budgeted), 0);
  const totalActualIncome = incomeLines.reduce((s, l) => s + Number(l.actual), 0);
  const totalBudgetedExpense = expenseLines.reduce((s, l) => s + Number(l.budgeted), 0);
  const totalActualExpense = expenseLines.reduce((s, l) => s + Number(l.actual), 0);
  const netBudgeted = totalBudgetedIncome - totalBudgetedExpense;
  const netActual = totalActualIncome - totalActualExpense;
  const budgetUsedPct = totalBudgetedExpense > 0 ? Math.round((totalActualExpense / totalBudgetedExpense) * 100) : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Budget & Finance"
        description={selectedBudget ? selectedBudget.label : "No budgets yet"}
        action={
          <div className="flex gap-2">
            {selectedBudget && (
              <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={exportBudget}>Export</Button>
            )}
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setCreateBudgetOpen(true)}>New budget</Button>
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard title="Total income" value={formatCurrency(totalActualIncome)} delta={`of ${formatCurrency(totalBudgetedIncome)}`} deltaType={totalActualIncome >= totalBudgetedIncome ? "up" : "neutral"} icon={<TrendingUp size={18} />} />
            <StatCard title="Total expenses" value={formatCurrency(totalActualExpense)} delta={`of ${formatCurrency(totalBudgetedExpense)}`} icon={<TrendingDown size={18} />} />
            <StatCard title="Net balance" value={formatCurrency(netActual)} deltaType={netActual >= 0 ? "up" : "down"} icon={<DollarSign size={18} />} />
            <StatCard title="Budget used" value={`${budgetUsedPct}%`} deltaType={budgetUsedPct > 100 ? "down" : "neutral"} icon={<BookOpen size={18} />} />
          </div>

          <Card>
            <CardHeader title="Expense budget utilization" />
            <ProgressBar value={budgetUsedPct} color={budgetUsedPct > 100 ? "red" : budgetUsedPct > 80 ? "yellow" : "green"} size="md" label={`${formatCurrency(totalActualExpense)} spent of ${formatCurrency(totalBudgetedExpense)} budgeted`} />
          </Card>

          <Tabs
            tabs={[
              { id: "overview", label: "Overview" },
              { id: "income", label: "Income", count: incomeLines.length },
              { id: "expense", label: "Expenses", count: expenseLines.length },
            ]}
            active={tab}
            onChange={setTab}
          />

          <div className="flex justify-end">
            <Button size="sm" icon={<Plus size={14} />} onClick={() => { setLineForm({ ...lineForm, type: tab === "income" ? "income" : "expense" }); setAddLineOpen(true); }}>
              Add line item
            </Button>
          </div>

          {(tab === "overview" ? lines : tab === "income" ? incomeLines : expenseLines).length === 0 ? (
            <EmptyState icon={<DollarSign size={20} />} title="No line items" action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setAddLineOpen(true)}>Add first line</Button>} />
          ) : (
            <Card padding="none">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Category","Type","Description","Budgeted","Actual","Variance",""].map((h) => (
                        <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(tab === "overview" ? lines : tab === "income" ? incomeLines : expenseLines).map((line) => {
                      const variance = Number(line.actual) - Number(line.budgeted);
                      const isOver = line.type === "expense" ? variance > 0 : variance < 0;
                      return (
                        <tr key={line.id} className="border-b border-border last:border-0 hover:bg-surface-1 transition-colors">
                          <td className="py-3 px-4 font-medium">{line.category}</td>
                          <td className="py-3 px-4">
                            <Badge label={line.type} color={line.type === "income" ? "green" : "red"} />
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">{line.description ?? "—"}</td>
                          <td className="py-3 px-4">{formatCurrency(Number(line.budgeted))}</td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              className="w-24 h-7 border border-border rounded-md bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                              value={line.actual}
                              onChange={(e) => updateActual(line.id, parseFloat(e.target.value) || 0)}
                              onBlur={(e) => updateActual(line.id, parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td className={`py-3 px-4 font-medium ${isOver ? "text-red-500" : "text-green-600"}`}>
                            {variance >= 0 ? "+" : ""}{formatCurrency(variance)}
                          </td>
                          <td className="py-3 px-4">
                            <button onClick={() => deleteLine(line.id)} className="text-muted-foreground hover:text-red-500">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-surface-1">
                      <td colSpan={3} className="py-3 px-4 font-bold text-foreground">Total</td>
                      <td className="py-3 px-4 font-bold">
                        {tab === "overview" ? `+${formatCurrency(totalBudgetedIncome)} / -${formatCurrency(totalBudgetedExpense)}` :
                          tab === "income" ? formatCurrency(totalBudgetedIncome) :
                          formatCurrency(totalBudgetedExpense)}
                      </td>
                      <td className="py-3 px-4 font-bold">
                        {tab === "overview" ? `+${formatCurrency(totalActualIncome)} / -${formatCurrency(totalActualExpense)}` :
                          tab === "income" ? formatCurrency(totalActualIncome) :
                          formatCurrency(totalActualExpense)}
                      </td>
                      <td className={`py-3 px-4 font-bold ${netActual >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {tab === "overview" ? formatCurrency(netActual) :
                          tab === "income" ? formatCurrency(totalActualIncome - totalBudgetedIncome) :
                          formatCurrency(totalActualExpense - totalBudgetedExpense)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
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
