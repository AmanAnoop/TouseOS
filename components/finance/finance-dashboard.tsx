"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, Banknote, Download, RefreshCw, Send, Wallet,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Alert, Badge, Button, Card, EmptyState, Input, ProgressBar, Select, StatCard,
} from "@/components/ui";
import { DEFAULT_BUDGET_CATEGORIES } from "@/lib/finance-categories";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PlaidLinkButton } from "@/components/finance/plaid-link-button";

interface DashboardData {
  settings: Record<string, unknown> | null;
  needsSetup: boolean;
  plaid: {
    status: string;
    institutionName?: string;
    lastSyncedAt?: string;
    balanceCurrent?: number;
    expired?: boolean;
  };
  stripe: {
    enabled: boolean;
    onboardingComplete: boolean;
    chargesEnabled: boolean;
  };
  stats: {
    bankBalance: number;
    duesCollected: number;
    duesOutstanding: number;
    totalSpent: number;
    balanceAlert?: boolean;
  };
  memberStats: { paid: number; unpaid: number; partial: number; waived: number; failed: number };
  categoryProgress: Array<{
    key: string;
    label: string;
    budgeted: number;
    actual: number;
    pct: number;
    health: "green" | "yellow" | "red";
  }>;
  projectedEndBalance?: number;
}

interface TxRow {
  id: string;
  source: string;
  occurred_at: string;
  amount: number;
  description?: string;
  merchant_name?: string;
  category_key?: string;
  status: string;
  pending_review?: boolean;
}

interface FinanceDashboardProps {
  orgId: string;
  onOpenSetup: () => void;
}

export function FinanceDashboard({ orgId, onOpenSetup }: FinanceDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [filterSource, setFilterSource] = useState("all");
  const [filterCategory, setFilterCategory] = useState("");
  const [search, setSearch] = useState("");
  const [reminding, setReminding] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/finance/dashboard?org_id=${encodeURIComponent(orgId)}`);
    if (res.ok) setData(await res.json());
    else toast.error("Failed to load finance dashboard");
    setLoading(false);
  }, [orgId]);

  const loadTransactions = useCallback(async () => {
    const params = new URLSearchParams({ org_id: orgId, limit: "100" });
    if (filterSource !== "all") params.set("source", filterSource);
    if (filterCategory) params.set("category", filterCategory);
    if (search.trim()) params.set("q", search.trim());
    const res = await fetch(`/api/finance/transactions?${params}`);
    if (res.ok) {
      const json = await res.json();
      setTransactions(json.transactions ?? []);
    }
  }, [orgId, filterSource, filterCategory, search]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  async function remindUnpaid() {
    setReminding(true);
    const res = await fetch("/api/finance/dues/remind", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId }),
    });
    setReminding(false);
    const json = await res.json().catch(() => ({}));
    if (res.ok) toast.success(`Reminders sent to ${json.sent ?? 0} members`);
    else toast.error(json.error ?? "Reminder failed");
  }

  async function recategorize(txId: string, categoryKey: string) {
    const res = await fetch("/api/finance/transactions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, transactionId: txId, categoryKey }),
    });
    if (res.ok) {
      toast.success("Category updated");
      loadTransactions();
      loadDashboard();
    }
  }

  if (loading && !data) {
    return <p className="text-sm text-muted-foreground p-6">Loading finances…</p>;
  }

  if (data?.needsSetup) {
    return (
      <EmptyState
        icon={<Wallet className="h-10 w-10" />}
        title="Set up chapter finances"
        description="Connect Stripe for dues and Plaid for your chapter bank account. Setup takes about five minutes."
        action={<Button onClick={onOpenSetup}>Start setup wizard</Button>}
      />
    );
  }

  const plaidBanner = data?.plaid.expired || data?.plaid.status === "error";
  const stripeIncomplete = data?.stripe.enabled && !data?.stripe.onboardingComplete;

  return (
    <div className="space-y-6">
      {plaidBanner && (
        <div className="space-y-2">
          <Alert
            type="warning"
            title="Bank connection needs attention"
            description={`Reconnect your account${data?.plaid.institutionName ? ` (${data.plaid.institutionName})` : ""}. Showing data last synced ${data?.plaid.lastSyncedAt ? formatDate(data.plaid.lastSyncedAt) : "unknown"}.`}
          />
          <PlaidLinkButton orgId={orgId} label="Reconnect bank" onSuccess={() => { loadDashboard(); loadTransactions(); }} />
        </div>
      )}

      {stripeIncomplete && (
        <div className="space-y-2">
          <Alert
            type="info"
            title="Complete Stripe Connect onboarding"
            description="Dues collection is disabled until Stripe onboarding is finished."
          />
          <Button size="sm" onClick={onOpenSetup}>Continue setup</Button>
        </div>
      )}

      {data?.stats.balanceAlert && (
        <Alert
          type="warning"
          title="Balance below threshold"
          description={`Current balance ${formatCurrency(data.stats.bankBalance)} is below your alert threshold.`}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Bank balance"
          value={formatCurrency(data?.stats.bankBalance ?? 0)}
          icon={<Banknote />}
          delta={data?.plaid.lastSyncedAt ? `Synced ${formatDate(data.plaid.lastSyncedAt)}` : undefined}
        />
        <StatCard
          title="Dues collected"
          value={formatCurrency(data?.stats.duesCollected ?? 0)}
          icon={<Wallet />}
        />
        <StatCard
          title="Dues outstanding"
          value={formatCurrency(data?.stats.duesOutstanding ?? 0)}
          icon={<AlertTriangle />}
        />
        <StatCard
          title="Spent this semester"
          value={formatCurrency(data?.stats.totalSpent ?? 0)}
          icon={<Banknote />}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" icon={<RefreshCw className="h-4 w-4" />} onClick={() => { loadDashboard(); loadTransactions(); }}>
          Refresh
        </Button>
        <Button loading={reminding} icon={<Send className="h-4 w-4" />} onClick={remindUnpaid}>
          Remind unpaid
        </Button>
        <a
          href={`/api/finance/transactions?org_id=${orgId}&export=csv`}
          className="ds-btn ds-btn-secondary inline-flex items-center gap-2 text-sm"
          download
        >
          <Download className="h-4 w-4" />
          Export CSV
        </a>
        <Link href="/payments" className="ds-btn ds-btn-secondary text-sm">Member dues view</Link>
        <Link href="/budget" className="ds-btn ds-btn-ghost text-sm">Manual budget editor</Link>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="font-semibold">Dues status</h3>
          <div className="flex flex-wrap gap-2">
            <Badge label={`${data?.memberStats.paid ?? 0} paid`} color="green" />
            <Badge label={`${data?.memberStats.unpaid ?? 0} unpaid`} color="yellow" />
            <Badge label={`${data?.memberStats.partial ?? 0} partial`} color="blue" />
            {((data?.memberStats.failed ?? 0) > 0) && (
              <Badge label={`${data?.memberStats.failed} failed`} color="red" />
            )}
          </div>
        </div>
        {data?.projectedEndBalance != null && (
          <p className="text-sm text-muted-foreground">
            Projected end-of-semester balance (burn rate estimate): {formatCurrency(data.projectedEndBalance)}
          </p>
        )}
      </Card>

      <Card>
        <h3 className="font-semibold mb-4">Budget vs actual</h3>
        <div className="space-y-4">
          {(data?.categoryProgress ?? []).map((c) => (
            <div key={c.key}>
              <div className="flex justify-between text-sm mb-1">
                <span>{c.label}</span>
                <span>
                  {formatCurrency(c.actual)} / {c.budgeted > 0 ? formatCurrency(c.budgeted) : "—"}
                </span>
              </div>
              <ProgressBar
                value={Math.min(100, c.pct)}
                color={c.health === "red" ? "red" : c.health === "yellow" ? "yellow" : "green"}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold mb-4">Transaction feed</h3>
        <div className="flex flex-wrap gap-3 mb-4">
          <Select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            options={[
              { value: "all", label: "All sources" },
              { value: "plaid", label: "Bank (Plaid)" },
              { value: "stripe", label: "Dues (Stripe)" },
              { value: "manual", label: "Manual" },
            ]}
          />
          <Select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            options={[
              { value: "", label: "All categories" },
              ...DEFAULT_BUDGET_CATEGORIES.map((c) => ({ value: c.key, label: c.label })),
            ]}
          />
          <Input
            placeholder="Search merchant or amount"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet. Connect Plaid or collect dues via Stripe.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ds-table w-full text-sm">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Category</th>
                  <th>Source</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td>{formatDate(t.occurred_at)}</td>
                    <td>
                      {t.merchant_name ?? t.description}
                      {t.pending_review && (
                        <Badge className="ml-2" label="Review" color="yellow" />
                      )}
                    </td>
                    <td className={Number(t.amount) < 0 ? "text-red-600" : "text-green-600"}>
                      {formatCurrency(Number(t.amount))}
                    </td>
                    <td>
                      <select
                        className="ds-input text-xs py-1"
                        value={t.category_key ?? "misc"}
                        onChange={(e) => recategorize(t.id, e.target.value)}
                      >
                        {DEFAULT_BUDGET_CATEGORIES.map((c) => (
                          <option key={c.key} value={c.key}>{c.label}</option>
                        ))}
                      </select>
                    </td>
                    <td><Badge label={t.source} color="gray" /></td>
                    <td>{t.status === "failed" && <Badge label="Failed" color="red" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
