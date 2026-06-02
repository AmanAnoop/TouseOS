import Link from "next/link";
import { Heart } from "lucide-react";
import { Badge } from "@/components/ui";
import { healthScoreLabel } from "@/lib/health-score";

interface HealthScoreBadgeProps {
  composite: number;
  href?: string;
}

export function HealthScoreBadge({ composite, href = "/health" }: HealthScoreBadgeProps) {
  const healthMeta = healthScoreLabel(composite);

  const content = (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
      healthMeta.color === "green" ? "border-green-200 bg-green-50 dark:bg-green-950/20" :
      healthMeta.color === "yellow" ? "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20" :
      "border-red-200 bg-red-50 dark:bg-red-950/20"
    }`}>
      <Heart size={18} className={
        healthMeta.color === "green" ? "text-green-600" :
        healthMeta.color === "yellow" ? "text-yellow-600" : "text-red-500"
      } />
      <div>
        <p className="text-xs text-muted-foreground">Health score</p>
        <p className="text-lg font-bold leading-none">{composite}</p>
      </div>
      <Badge label={healthMeta.label} color={healthMeta.color} />
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
