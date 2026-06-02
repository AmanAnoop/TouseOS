"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Badge, Card, EmptyState, Select, StatCard } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { CreditCard } from "lucide-react";

interface BillingOrg {
  id: string;
  name: string;
  platform_plan: string;
  platform_plan_status: string;
  stripe_account_id: string | null;
}

export function PlatformBillingPanel() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{
    totalOrgs: number;
    stripeConnected: number;
    estimatedMrr: number;
  } | null>(null);
  const [orgs, setOrgs] = useState<BillingOrg[]>([]);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/platform-admin/billing");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error ?? "Could not load billing");
      return;
    }
    setSummary(data.summary);
    setOrgs(data.organizations ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function updatePlan(orgId: string, platformPlan: string) {
    const res = await fetch("/api/platform-admin/billing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, platformPlan }),
    });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error ?? "Update failed");
      return;
    }
    toast.success("Plan updated");
    load();
  }

  if (loading) {
    return <Card className="h-40 animate-pulse bg-surface-2 border-0">&nbsp;</Card>;
  }

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard title="Est. MRR" value={formatCurrency(summary.estimatedMrr)} icon={<CreditCard size={18} />} />
          <StatCard title="Stripe connected" value={summary.stripeConnected} icon={<CreditCard size={18} />} />
          <StatCard title="Orgs on platform" value={summary.totalOrgs} icon={<CreditCard size={18} />} />
        </div>
      )}

      {orgs.length === 0 ? (
        <EmptyState icon={<CreditCard size={24} />} title="No organizations" />
      ) : (
        <div className="space-y-2">
          {orgs.map((o) => (
            <Card key={o.id} padding="sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm">{o.name}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge label={o.platform_plan_status} color={o.platform_plan_status === "active" ? "green" : "yellow"} />
                    {o.stripe_account_id ? (
                      <Badge label="Stripe connected" color="blue" />
                    ) : (
                      <Badge label="No Stripe" color="gray" />
                    )}
                  </div>
                </div>
                <Select
                  value={o.platform_plan}
                  onChange={(e) => updatePlan(o.id, e.target.value)}
                  options={[
                    { value: "starter", label: "Starter ($0)" },
                    { value: "chapter", label: "Chapter ($49)" },
                    { value: "council", label: "Council ($199)" },
                    { value: "enterprise", label: "Enterprise ($499)" },
                  ]}
                  className="w-44 min-h-[44px]"
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
