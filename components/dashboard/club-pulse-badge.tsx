import Link from "next/link";
import { HandHeart } from "lucide-react";
import { Badge } from "@/components/ui";

interface ClubPulseBadgeProps {
  activeMembers: number;
  collectionRate: number;
  href?: string;
}

export function ClubPulseBadge({
  activeMembers,
  collectionRate,
  href = "/payments",
}: ClubPulseBadgeProps) {
  const color =
    collectionRate >= 75 ? "green" :
    collectionRate >= 50 ? "yellow" : "red";
  const label =
    collectionRate >= 75 ? "On track" :
    collectionRate >= 50 ? "Behind" : "Needs attention";

  const borderClass =
    color === "green" ? "border-green-200 bg-green-50 dark:bg-green-950/20" :
    color === "yellow" ? "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20" :
    "border-red-200 bg-red-50 dark:bg-red-950/20";

  const iconClass =
    color === "green" ? "text-green-600" :
    color === "yellow" ? "text-yellow-600" : "text-red-500";

  const content = (
    <div className={`dashboard-metric-badge ${borderClass}`}>
      <HandHeart size={20} className={iconClass} aria-hidden />
      <div className="min-w-0">
        <p className="dashboard-metric-badge__label">Org pulse</p>
        <p className="dashboard-metric-badge__value">{collectionRate}%</p>
        <p className="text-[10px] text-muted-foreground">{activeMembers} active members</p>
      </div>
      <Badge label={label} color={color} />
    </div>
  );

  if (href) return <Link href={href} className="no-underline">{content}</Link>;
  return content;
}
