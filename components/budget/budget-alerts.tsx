"use client";

import { Alert } from "@/components/ui";
import type { BudgetAlert } from "@/lib/budget-alerts";

interface BudgetAlertsProps {
  alerts: BudgetAlert[];
}

const SEVERITY_TYPE: Record<BudgetAlert["severity"], "error" | "warning" | "info"> = {
  critical: "error",
  warning: "warning",
  info: "info",
};

export function BudgetAlerts({ alerts }: BudgetAlertsProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <Alert
          key={alert.id}
          type={SEVERITY_TYPE[alert.severity]}
          title={alert.title}
          description={alert.message}
        />
      ))}
    </div>
  );
}
