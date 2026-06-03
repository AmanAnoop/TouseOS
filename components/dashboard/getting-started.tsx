import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardHeader } from "@/components/ui";
import type { SetupStep } from "@/lib/dashboard-data";

interface GettingStartedProps {
  steps: SetupStep[];
}

export function GettingStarted({ steps }: GettingStartedProps) {
  const incomplete = steps.filter((s) => !s.done);
  if (incomplete.length === 0) return null;

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <Card>
      <CardHeader
        title="Getting started"
        description={`${doneCount} of ${steps.length} setup steps complete`}
      />
      <ul className="space-y-2">
        {incomplete.map((step) => (
          <li key={step.id}>
            <Link
              href={step.href}
              className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-surface-1 transition-colors"
            >
              <Circle size={18} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{step.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {doneCount > 0 && (
        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
          <CheckCircle2 size={12} className="text-green-600" />
          {doneCount} step{doneCount !== 1 ? "s" : ""} already done — keep going!
        </p>
      )}
    </Card>
  );
}
