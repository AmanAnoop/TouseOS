import Link from "next/link";
import { Calendar, CheckCircle2, DollarSign, FileText } from "lucide-react";
import { Card, CardHeader, Badge, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export interface DeadlineItem {
  id: string;
  kind: "task" | "payment" | "form";
  title: string;
  dueAt: string;
  href: string;
  meta?: string;
  overdue?: boolean;
}

interface UpcomingDeadlinesProps {
  items: DeadlineItem[];
}

const KIND_ICON = {
  task: CheckCircle2,
  payment: DollarSign,
  form: FileText,
} as const;

export function UpcomingDeadlines({ items }: UpcomingDeadlinesProps) {
  const sorted = [...items].sort(
    (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
  );
  const upcoming = sorted.slice(0, 10);

  return (
    <Card className="lg:col-span-2">
      <CardHeader
        title="Upcoming deadlines"
        icon={<Calendar size={16} />}
        action={<Link href="/tasks" className="text-xs text-racing hover:underline">All tasks</Link>}
      />
      {upcoming.length === 0 ? (
        <EmptyState icon={<Calendar size={20} />} title="No upcoming deadlines" />
      ) : (
        <div className="space-y-2">
          {upcoming.map((item) => {
            const Icon = KIND_ICON[item.kind];
            return (
              <Link
                key={`${item.kind}-${item.id}`}
                href={item.href}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-1 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-surface-1 flex items-center justify-center text-muted-foreground flex-shrink-0">
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  {item.meta && (
                    <p className="text-xs text-muted-foreground truncate">{item.meta}</p>
                  )}
                </div>
                {item.overdue ? (
                  <Badge label="Overdue" color="red" className="flex-shrink-0" />
                ) : (
                  <Badge label={formatDate(item.dueAt)} color="gray" className="flex-shrink-0" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}
