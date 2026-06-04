import { NextResponse } from "next/server";
import { requireFinanceOfficer } from "@/lib/finance-api";
import { DEFAULT_BUDGET_CATEGORIES } from "@/lib/finance-categories";
import { getConnectAccountStatus, isStripeConnectEnabled } from "@/lib/stripe-connect";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const auth = await requireFinanceOfficer(orgId);
  if (!auth.ok) return auth.response;

  const { data: settings } = await auth.supabase
    .from("finance_org_settings")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle();

  const { data: org } = await auth.supabase
    .from("organizations")
    .select("stripe_account_id")
    .eq("id", orgId)
    .single();

  let stripeStatus = {
    enabled: isStripeConnectEnabled(),
    onboardingComplete: false,
    chargesEnabled: false,
  };
  if (org?.stripe_account_id && stripeStatus.enabled) {
    try {
      const s = await getConnectAccountStatus(org.stripe_account_id);
      stripeStatus = {
        enabled: true,
        onboardingComplete: s.detailsSubmitted && s.chargesEnabled,
        chargesEnabled: s.chargesEnabled,
      };
    } catch {
      /* keep defaults */
    }
  }

  const { data: payments } = await auth.supabase
    .from("payments")
    .select("id, amount, paid_amount, status, due_date, member_id, payment_items(category, title)")
    .eq("org_id", orgId);

  const duesRows = (payments ?? []).filter((p) => {
    const item = Array.isArray(p.payment_items) ? p.payment_items[0] : p.payment_items;
    return item?.category === "dues" || !item?.category;
  });

  const duesCollected = duesRows.reduce((s, p) => s + Number(p.paid_amount ?? 0), 0);
  const duesOwed = duesRows.reduce((s, p) => {
    const owed = Number(p.amount ?? 0) - Number(p.paid_amount ?? 0);
    return s + Math.max(0, owed);
  }, 0);
  const duesExpected = duesRows.reduce((s, p) => s + Number(p.amount ?? 0), 0);

  const memberStats = {
    paid: duesRows.filter((p) => p.status === "paid").length,
    unpaid: duesRows.filter((p) => p.status === "pending" || p.status === "overdue").length,
    partial: duesRows.filter((p) => p.status === "partial").length,
    waived: duesRows.filter((p) => p.status === "waived").length,
    failed: duesRows.filter((p) => p.status === "failed").length,
  };

  const since = new Date();
  since.setMonth(since.getMonth() - 4);

  const { data: txRows } = await auth.supabase
    .from("finance_transactions")
    .select("amount, category_key, source, occurred_at")
    .eq("org_id", orgId)
    .gte("occurred_at", since.toISOString());

  let totalSpent = 0;
  const spendByCategory: Record<string, number> = {};
  for (const t of txRows ?? []) {
    if (t.source === "plaid" && Number(t.amount) < 0) {
      const spend = Math.abs(Number(t.amount));
      totalSpent += spend;
      const key = t.category_key ?? "misc";
      spendByCategory[key] = (spendByCategory[key] ?? 0) + spend;
    }
  }

  const { data: budget } = await auth.supabase
    .from("budgets")
    .select("id, label, total_budget, budget_lines(id, category, type, description, budgeted, actual)")
    .eq("org_id", orgId)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const categoryProgress = DEFAULT_BUDGET_CATEGORIES
    .filter((c) => c.type === "expense")
    .map((c) => {
      const line = budget?.budget_lines?.find((l: { category?: string; description?: string | null }) => {
        const desc = String(l.description ?? "");
        return desc === `finance:${c.key}` || l.category === c.label;
      });
      const budgeted = Number(line?.budgeted ?? 0);
      const actual = spendByCategory[c.key] ?? Number(line?.actual ?? 0);
      const pct = budgeted > 0 ? Math.round((actual / budgeted) * 100) : 0;
      let health: "green" | "yellow" | "red" = "green";
      if (budgeted > 0 && pct >= 100) health = "red";
      else if (budgeted > 0 && pct >= 85) health = "yellow";
      return { key: c.key, label: c.label, budgeted, actual, pct, health };
    });

  const balance = Number(settings?.plaid_balance_current ?? 0);
  const threshold = settings?.balance_alert_threshold != null
    ? Number(settings.balance_alert_threshold)
    : null;
  const balanceAlert = threshold != null && balance < threshold;

  const burnPerDay = totalSpent / Math.max(1, Math.ceil((Date.now() - since.getTime()) / 86400000));
  const daysLeftInSemester = 90;
  const projectedBalance = balance - burnPerDay * daysLeftInSemester + duesOwed * 0.5;

  return NextResponse.json({
    settings,
    needsSetup: !settings?.setup_completed_at,
    plaid: {
      status: settings?.plaid_status ?? "disconnected",
      institutionName: settings?.plaid_institution_name,
      lastSyncedAt: settings?.plaid_last_synced_at,
      balanceCurrent: settings?.plaid_balance_current,
      balanceAvailable: settings?.plaid_balance_available,
      expired: settings?.plaid_status === "expired" || settings?.plaid_status === "error",
    },
    stripe: stripeStatus,
    stats: {
      bankBalance: balance,
      duesCollected,
      duesOutstanding: duesOwed,
      duesExpected,
      totalSpent,
      balanceAlert,
    },
    memberStats,
    categoryProgress,
    projectedEndBalance: projectedBalance,
    activeBudgetId: budget?.id ?? null,
  });
}
