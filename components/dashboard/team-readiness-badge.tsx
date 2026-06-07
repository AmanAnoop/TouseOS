import Link from "next/link";
import { Shield } from "lucide-react";
import { Badge } from "@/components/ui";

interface TeamReadinessBadgeProps {
  waiverRate: number;
  missingWaivers: number;
  injuredCount: number;
  href?: string;
}

export function TeamReadinessBadge({
  waiverRate,
  missingWaivers,
  injuredCount,
  href = "/waivers",
}: TeamReadinessBadgeProps) {
  const color =
    waiverRate >= 90 && injuredCount === 0 ? "green" :
    waiverRate >= 70 ? "yellow" : "red";
  const label =
    waiverRate >= 90 && injuredCount === 0 ? "Ready" :
    missingWaivers > 0 ? "Waivers due" : injuredCount > 0 ? "Injuries" : "Needs attention";

  const borderClass =
    color === "green" ? "border-green-200 bg-green-50 dark:bg-green-950/20" :
    color === "yellow" ? "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20" :
    "border-red-200 bg-red-50 dark:bg-red-950/20";

  const iconClass =
    color === "green" ? "text-green-600" :
    color === "yellow" ? "text-yellow-600" : "text-red-500";

  const content = (
    <div className={`dashboard-metric-badge ${borderClass}`}>
      <Shield size={20} className={iconClass} aria-hidden />
      <div className="min-w-0">
        <p className="dashboard-metric-badge__label">Team readiness</p>
        <p className="dashboard-metric-badge__value">{waiverRate}%</p>
      </div>
      <Badge label={label} color={color} />
    </div>
  );

  if (href) return <Link href={href} className="no-underline">{content}</Link>;
  return content;
}
