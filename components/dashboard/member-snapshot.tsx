import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  DollarSign,
  FileText,
  User,
} from "lucide-react";
import { Card, CardHeader, Badge, EmptyState } from "@/components/ui";
import { NmeProgressBanner } from "@/components/nme/nme-progress-banner";
import { formatDateTime } from "@/lib/utils";
import type { Event, MemberProfile, Task } from "@/types";

interface MemberSnapshotProps {
  profile: MemberProfile | null;
  events: Event[];
  myTasks: Task[];
}

export function MemberSnapshot({ profile, events, myTasks }: MemberSnapshotProps) {
  const paymentOk = profile?.payment_status === "current";
  const formsOk =
    !profile ||
    profile.forms_required <= 0 ||
    profile.forms_completed >= profile.forms_required;

  return (
    <div className="space-y-4">
      {profile?.org_id && <NmeProgressBanner orgId={profile.org_id} />}
      <div className="grid lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader title="Your status" icon={<User size={16} />} action={<Link href="/profile" className="text-xs text-greek-600 hover:underline">Profile</Link>} />
        {!profile ? (
          <EmptyState icon={<User size={20} />} title="Profile not linked" description="Complete your roster profile so officers can reach you." />
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium">{profile.full_name}</p>
            <div className="flex flex-wrap gap-2">
              <Badge
                label={paymentOk ? "Dues current" : "Payment due"}
                color={paymentOk ? "green" : "red"}
              />
              <Badge
                label={formsOk ? "Forms complete" : "Forms incomplete"}
                color={formsOk ? "green" : "yellow"}
              />
              {profile.attendance_rate > 0 && (
                <Badge label={`${profile.attendance_rate}% attendance`} color="blue" />
              )}
            </div>
            {!paymentOk && (
              <Link href="/payments" className="text-sm text-greek-600 hover:underline inline-flex items-center gap-1">
                <DollarSign size={14} /> Pay dues →
              </Link>
            )}
            {!formsOk && (
              <Link href="/forms" className="text-sm text-greek-600 hover:underline inline-flex items-center gap-1">
                <FileText size={14} /> Complete forms →
              </Link>
            )}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Your tasks" icon={<CheckCircle2 size={16} />} action={<Link href="/tasks" className="text-xs text-greek-600 hover:underline">All tasks</Link>} />
        {myTasks.length === 0 ? (
          <EmptyState icon={<CheckCircle2 size={20} />} title="No open tasks" />
        ) : (
          <div className="space-y-2">
            {myTasks.map((t) => {
              const overdue = t.due_date && new Date(t.due_date) < new Date();
              return (
                <Link
                  key={t.id}
                  href="/tasks"
                  className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-surface-1"
                >
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  {t.due_date && (
                    <Badge
                      label={overdue ? "Overdue" : formatDateTime(t.due_date)}
                      color={overdue ? "red" : "gray"}
                      className="flex-shrink-0"
                    />
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Upcoming for you" icon={<Calendar size={16} />} action={<Link href="/events" className="text-xs text-greek-600 hover:underline">Events</Link>} />
        {events.length === 0 ? (
          <EmptyState icon={<Calendar size={20} />} title="No upcoming events" />
        ) : (
          <div className="space-y-2">
            {events.slice(0, 3).map((e) => (
              <Link
                key={e.id}
                href={`/events/${e.id}`}
                className="block p-2 rounded-lg hover:bg-surface-1"
              >
                <p className="text-sm font-medium truncate">{e.title}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(e.starts_at)}</p>
              </Link>
            ))}
          </div>
        )}
      </Card>
      </div>
    </div>
  );
}
