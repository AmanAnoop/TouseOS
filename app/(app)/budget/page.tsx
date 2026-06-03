"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BookOpen, DollarSign, Download, Plus, RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
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
import { computeDuesForecast, type PaymentSummary } from "@/lib/dues-forecast";
import { BudgetLineTable } from "@/components/budget/budget-line-table";
import { FinanceLedgerPanel } from "@/components/budget/finance-ledger-panel";
import {
  DEFAULT_EXPENSE_LINES,
  DEFAULT_INCOME_LINES,
  type FinanceLedger,
} from "@/lib/budget-sync";
import { EventPnlPanel } from "@/components/budget/event-pnl-panel";
import { PerMemberCostPanel } from "@/components/budget/per-member-cost-panel";
import { computeEventPnl } from "@/lib/event-pnl";
import { computePerMemberCost } from "@/lib/per-member-cost";
import type { MemberProfile } from "@/types";
import { can } from "@/lib/permissions";
import { getProductId } from "@/lib/org-product";
import { computeReimbursementAgingAlerts } from "@/lib/reimbursement-aging";
import { buildBudgetReportHtml, downloadBudgetReportHtml } from "@/lib/budget-export";
import { Alert } from "@/components/ui";
import { useOrg } from "@/hooks/use-org";

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

const INCOME_CATEGORIES = DEFAULT_INCOME_LINES;
const EXPENSE_CATEGORIES = DEFAULT_EXPENSE_LINES;

export default function BudgetPage() {
  const { orgId, role: myRole, orgName, orgType, loading: orgLoading } = useOrg();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [reimbs, setReimbs] = useState<Array<{ id: string; amount: number; status: string; created_at: string; submitted_by_name: string | null; category: string; event_id: string | null; submitted_by: string | null }>>([]);
  const [events, setEvents] = useState<Array<{ id: string; title: string; starts_at: string }>>([]);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [eventPayments, setEventPayments] = useState<Array<{ amount: number; paid_amount: number; status: string; payment_items: { event_id: string | null } | null }>>([]);
  const [payments, setPayments] = useState<PaymentSummary[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [ledger, setLedger] = useState<FinanceLedger | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [tab, setTab] = useState("overview");
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [createBudgetOpen, setCreateBudgetOpen] = useState(false);
  const [addLineOpen, setAddLineOpen] = useState(false);

  const [budgetForm, setBudgetForm] = useState({
    label: "", period: "semester", fiscalYear: String(new Date().getFullYear()),
    semester: "fall", totalBudget: "",
  });
  const [lineForm, setLineForm] = useState({
    category: "Chapter dues", type: "income" as "income" | "expense",
    description: "", budgeted: "", actual: "0",
  });

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const [budgetRes, paymentsRes, reimbRes, eventsRes, membersRes] = await Promise.all([
      fetch(`/api/budget?org_id=${encodeURIComponent(oid)}`),
      fetch(`/api/payments?org_id=${encodeURIComponent(oid)}`),
      fetch(`/api/reimbursements?org_id=${encodeURIComponent(oid)}`),
      fetch(`/api/events?org_id=${encodeURIComponent(oid)}`),
      fetch(`/api/members?org_id=${encodeURIComponent(oid)}`),
    ]);
    if (budgetRes.ok) {
      const data = await budgetRes.json();
      setBudgets(data);
      if (data.length > 0) setSelectedBudget(data[0]);
    }
    const rawPayments = paymentsRes.ok
      ? ((await paymentsRes.json()) as unknown as Array<{
      id: string;
      amount: number;
      paid_amount: number;
      status: string;
      due_date: string | null;
      member_id: string | null;
      payment_items?: { category?: string; event_id?: string | null } | { category?: string; event_id?: string | null }[] | null;
    }>)
      : [];
    setPayments(rawPayments.map((p): PaymentSummary => {
      const item = Array.isArray(p.payment_items) ? p.payment_items[0] : p.payment_items;
      return {
        id: p.id,
        amount: p.amount,
        paid_amount: p.paid_amount,
        status: p.status,
        due_date: p.due_date,
        category: item?.category ?? null,
      };
    }));
    if (reimbRes.ok) {
      setReimbs((await reimbRes.json()) as typeof reimbs);
    }
    if (eventsRes.ok) {
      const allEvents = (await eventsRes.json()) as Array<{ id: string; title: string; starts_at: string }>;
      setEvents(allEvents.sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()).slice(0, 50));
    }
    if (membersRes.ok) setMembers((await membersRes.json()) as MemberProfile[]);
    setEventPayments(
      rawPayments.map((p) => {
        const item = Array.isArray(p.payment_items) ? p.payment_items[0] : p.payment_items;
        return {
          amount: p.amount,
          paid_amount: p.paid_amount,
          status: p.status,
          member_id: p.member_id,
          payment_items: item ? { event_id: item.event_id ?? null } : null,
        };
      }) as typeof eventPayments,
    );
    setLedgerLoading(true);
    const ledgerRes = await fetch(`/api/budget/ledger?org_id=${oid}`);
    if (ledgerRes.ok) {
      const body = await ledgerRes.json();
      setLedger(body.ledger ?? null);
    }
    setLedgerLoading(false);
    setLoading(false);
  }, []);

  const syncFullBudget = useCallback(async (opts?: { silent?: boolean }) => {
    const budgetId = selectedBudget?.id;
    if (!budgetId || !orgId) return;
    setSyncing(true);
    const res = await fetch("/api/budget/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, budgetId }),
    });
    setSyncing(false);
    const data = await res.json();
    if (!res.ok) {
      if (!opts?.silent) toast.error(data.error ?? "Sync failed");
      return;
    }
    if (data.budget) {
      setSelectedBudget(data.budget);
      setBudgets((prev) => prev.map((b) => (b.id === data.budget.id ? data.budget : b)));
    }
    if (data.ledger) setLedger(data.ledger);
    const s = data.summary;
    if (!opts?.silent) {
      toast.success(
        `Synced ${formatCurrency(s?.totalCollected ?? 0)} collected · ${formatCurrency(s?.reimbursementsPaid ?? 0)} reimbursements paid`,
      );
    }
  }, [orgId, selectedBudget?.id]);

  useEffect(() => {
    if (!orgId || !selectedBudget?.id || !can(myRole, "manage_budget") || loading) return;
    void syncFullBudget({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when budget/org loads only
  }, [orgId, selectedBudget?.id, myRole, loading]);

  useEffect(() => {
    if (orgId) load(orgId);
    else if (!orgLoading) setLoading(false);
  }, [orgId, orgLoading, load]);

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
    const res = await fetch("/api/budget", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add",
        budgetId: selectedBudget.id,
        category: lineForm.category,
        type: lineForm.type,
        description: lineForm.description,
        budgeted: parseFloat(lineForm.budgeted || "0"),
        actual: parseFloat(lineForm.actual || "0"),
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Failed to add line");
      return;
    }
    const newLine = (await res.json()) as BudgetLine;
    setSelectedBudget((prev) => prev ? { ...prev, budget_lines: [...prev.budget_lines, newLine] } : prev);
    setBudgets((prev) => prev.map((b) => b.id === selectedBudget.id ? { ...b, budget_lines: [...b.budget_lines, newLine] } : b));
    toast.success("Line added");
    setAddLineOpen(false);
    setLineForm({ category: "Chapter dues", type: "income", description: "", budgeted: "", actual: "0" });
  }

  async function updateActual(lineId: string, actual: number) {
    await fetch("/api/budget", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineId, actual }),
    });
    setSelectedBudget((prev) => prev ? {
      ...prev,
      budget_lines: prev.budget_lines.map((l) => l.id === lineId ? { ...l, actual } : l),
    } : prev);
  }

  async function updateBudgeted(lineId: string, budgeted: number) {
    await fetch("/api/budget", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineId, budgeted }),
    });
    setSelectedBudget((prev) => prev ? {
      ...prev,
      budget_lines: prev.budget_lines.map((l) => l.id === lineId ? { ...l, budgeted } : l),
    } : prev);
  }

  async function deleteLine(lineId: string) {
    await fetch("/api/budget", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", lineId }),
    });
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
  const showHousingLink = getProductId(orgType) === "greek";
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
  const eventPnl = computeEventPnl(events, eventPayments, reimbs);
  const perMemberRows = computePerMemberCost(members, payments as unknown as import("@/lib/per-member-cost").PaymentForCost[], reimbs, totalActualExpense);

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
                {canEditBudget && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="officer-touch"
                    icon={<RefreshCw size={14} />}
                    loading={syncing}
                    onClick={() => syncFullBudget()}
                  >
                    Sync all
                  </Button>
                )}
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
          <FinanceLedgerPanel ledger={ledger} loading={ledgerLoading} showHousing={showHousingLink} />
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
              { id: "ledger", label: "Finance ledger" },
              { id: "forecast", label: "Cash flow" },
              { id: "dues", label: "Dues forecast" },
              { id: "events", label: "Event P&L" },
              { id: "members", label: "Per member" },
              { id: "income", label: "Income", count: incomeLines.length },
              { id: "expense", label: "Expenses", count: expenseLines.length },
            ]}
            active={tab}
            onChange={setTab}
          />

          {tab === "ledger" ? (
            <FinanceLedgerPanel ledger={ledger} loading={ledgerLoading} showHousing={showHousingLink} />
          ) : tab === "forecast" ? (
            <CashFlowForecastPanel forecast={cashFlowForecast} />
          ) : tab === "dues" ? (
            <DuesForecastPanel forecast={duesForecast} onSyncToBudget={() => syncFullBudget()} syncing={syncing} />
          ) : tab === "events" ? (
            <EventPnlPanel rows={eventPnl} />
          ) : tab === "members" ? (
            <PerMemberCostPanel rows={perMemberRows} totalChapterSpend={totalActualExpense} />
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
              <button key={t} onClick={() => { setLineForm({ ...lineForm, type: t, category: t === "income" ? "Chapter dues" : "Reimbursements (paid)" }); }}
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
