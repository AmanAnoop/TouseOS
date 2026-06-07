"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader, Tabs } from "@/components/ui";
import { FinanceDashboard } from "@/components/finance/finance-dashboard";
import { FinanceForecastsSection } from "@/components/finance/finance-forecasts-section";
import { FinanceSetupWizard } from "@/components/finance/setup-wizard";
import { BudgetWorkspace } from "@/components/budget/budget-workspace";
import { canViewFinancePage, isFinanceOfficerRole } from "@/lib/finance-access";
import { useOrg } from "@/hooks/use-org";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "forecasts", label: "Forecasts" },
  { id: "budget", label: "Budget lines" },
  { id: "transactions", label: "Transactions" },
] as const;

type FinanceTab = (typeof TABS)[number]["id"];

function isFinanceTab(value: string | null): value is FinanceTab {
  return TABS.some((t) => t.id === value);
}

export function UnifiedFinancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { orgId, role, loading: orgLoading } = useOrg();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [stripeStatus, setStripeStatus] = useState({ connected: false, chargesEnabled: false });

  const tabParam = searchParams.get("tab");
  const tab: FinanceTab = isFinanceTab(tabParam) ? tabParam : "overview";

  const setTab = useCallback((id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id === "overview") params.delete("tab");
    else params.set("tab", id);
    const qs = params.toString();
    router.push(qs ? `/finance?${qs}` : "/finance");
  }, [router, searchParams]);

  useEffect(() => {
    if (orgLoading) return;
    if (!canViewFinancePage(role)) {
      router.replace("/dashboard");
    }
  }, [orgLoading, role, router]);

  useEffect(() => {
    if (!orgId || !isFinanceOfficerRole(role)) return;
    fetch(`/api/finance/setup?org_id=${encodeURIComponent(orgId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.needsSetup && tab === "overview") setWizardOpen(false);
        if (data.stripe) {
          setStripeStatus({
            connected: Boolean(data.stripe.connected),
            chargesEnabled: Boolean(data.stripe.chargesEnabled),
          });
        }
      });
  }, [orgId, role, tab]);

  if (orgLoading || !orgId || !canViewFinancePage(role)) {
    return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  }

  const isOfficer = isFinanceOfficerRole(role);
  const visibleTabs = isOfficer ? [...TABS] : TABS.filter((t) => t.id !== "transactions");

  return (
    <div className="ds-page-stack">
      <PageHeader
        title="Budget & Finance"
        description="Charts, budget lines, bank activity, and dues — all in one place."
        action={isOfficer ? (
          <button
            type="button"
            className="ds-btn ds-btn-secondary text-sm"
            onClick={() => setWizardOpen(true)}
          >
            Finance setup
          </button>
        ) : undefined}
      />

      <div className="overflow-x-auto scrollbar-hide">
        <Tabs tabs={[...TABS]} active={tab} onChange={setTab} />
      </div>

      {tab === "overview" && (
        <div className="space-y-8">
          <FinanceForecastsSection orgId={orgId} onCreateBudget={() => setTab("budget")} />
          <FinanceDashboard
            orgId={orgId}
            isFinanceOfficer={isOfficer}
            view="overview"
            onOpenSetup={() => setWizardOpen(true)}
          />
        </div>
      )}

      {tab === "forecasts" && (
        <FinanceForecastsSection orgId={orgId} fullPage onCreateBudget={() => setTab("budget")} />
      )}

      {tab === "budget" && <BudgetWorkspace embedded />}

      {tab === "transactions" && (
        <FinanceDashboard
          orgId={orgId}
          isFinanceOfficer={isOfficer}
          view="transactions"
          onOpenSetup={() => setWizardOpen(true)}
        />
      )}

      {isOfficer && (
        <>
          <p className="text-center text-xs text-muted-foreground">
            Connect your bank anytime under Settings → Integrations.
          </p>
          <FinanceSetupWizard
            orgId={orgId}
            open={wizardOpen}
            onClose={() => setWizardOpen(false)}
            onComplete={() => window.location.reload()}
            stripeConnected={stripeStatus.connected}
            stripeChargesEnabled={stripeStatus.chargesEnabled}
          />
        </>
      )}
    </div>
  );
}
