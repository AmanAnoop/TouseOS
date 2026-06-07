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

  const content = (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${borderClass}`}>
      <Shield size={18} className={
        color === "green" ? "text-green-600" :
        color === "yellow" ? "text-yellow-600" : "text-red-500"
      } />
      <div>
        <p className="text-xs text-muted-foreground">Team readiness</p>
        <p className="text-lg font-bold leading-none">{waiverRate}%</p>
      </div>
      <Badge label={label} color={color} />
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}
