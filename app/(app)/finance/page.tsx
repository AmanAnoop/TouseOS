"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { FinanceDashboard } from "@/components/finance/finance-dashboard";
import { FinanceSetupWizard } from "@/components/finance/setup-wizard";
import { isFinanceOfficerRole } from "@/lib/finance-access";
import { useOrg } from "@/hooks/use-org";

export default function FinancePage() {
  const router = useRouter();
  const { orgId, role, loading: orgLoading } = useOrg();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [stripeStatus, setStripeStatus] = useState({ connected: false, chargesEnabled: false });

  useEffect(() => {
    if (orgLoading) return;
    if (!isFinanceOfficerRole(role)) {
      router.replace("/dashboard");
    }
  }, [orgLoading, role, router]);

  useEffect(() => {
    if (!orgId) return;
    fetch(`/api/finance/setup?org_id=${encodeURIComponent(orgId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.needsSetup) setWizardOpen(true);
        if (data.stripe) {
          setStripeStatus({
            connected: Boolean(data.stripe.connected),
            chargesEnabled: Boolean(data.stripe.chargesEnabled),
          });
        }
      });
  }, [orgId]);

  if (orgLoading || !orgId || !isFinanceOfficerRole(role)) {
    return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budget & Finance"
        description="Unified view of chapter bank activity, dues collection, and budget performance."
        action={(
          <button
            type="button"
            className="ds-btn ds-btn-secondary text-sm"
            onClick={() => setWizardOpen(true)}
          >
            Finance setup
          </button>
        )}
      />
      <FinanceDashboard
        orgId={orgId}
        onOpenSetup={() => setWizardOpen(true)}
      />
      <p className="text-center text-xs text-muted-foreground">
        You can also connect your bank anytime under Settings → Integrations.
      </p>
      <FinanceSetupWizard
        orgId={orgId}
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onComplete={() => window.location.reload()}
        stripeConnected={stripeStatus.connected}
        stripeChargesEnabled={stripeStatus.chargesEnabled}
      />
    </div>
  );
}
