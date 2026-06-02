"use client";

import { Heart, TrendingUp, Users } from "lucide-react";
import { Badge, Card, CardHeader, EmptyState, ProgressBar, StatCard } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export interface EngagementMember {
  id: string;
  full_name: string;
  attended: number;
  total: number;
  rate: number;
}

export interface EngagementEvent {
  id: string;
  title: string;
  type: string;
  starts_at: string;
  attendeeCount: number;
}

interface EngagementDashboardProps {
  members: EngagementMember[];
  events: EngagementEvent[];
  semesterGoal: number;
  orgLabel: string;
}

export function EngagementDashboard({
  members, events, semesterGoal, orgLabel,
}: EngagementDashboardProps) {
  const avgRate = members.length > 0
    ? Math.round(members.reduce((s, m) => s + m.rate, 0) / members.length)
    : 0;
  const atGoal = members.filter((m) => m.attended >= semesterGoal).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard title={`${orgLabel} events`} value={events.length} icon={<Heart size={18} />} />
        <StatCard title="Avg participation" value={`${avgRate}%`} icon={<TrendingUp size={18} />} />
        <StatCard title="Met semester goal" value={`${atGoal}/${members.length}`} icon={<Users size={18} />} />
      </div>

      <Card>
        <CardHeader
          title="Upcoming bonding events"
          description={`Semester goal: attend ${semesterGoal} ${orgLabel.toLowerCase()} events`}
        />
        {events.length === 0 ? (
          <EmptyState
            icon={<Heart size={20} />}
            title="No bonding events scheduled"
            description={`Create events with type Brotherhood or Sisterhood to track engagement.`}
          />
        ) : (
          <div className="space-y-2">
            {events.slice(0, 6).map((e) => (
              <div key={e.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <p className="font-medium text-sm">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(e.starts_at)} · {e.attendeeCount} RSVPs</p>
                </div>
                <Badge label={e.type.replace("_", " ")} color="purple" />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Member participation" description="Attendance at brotherhood/sisterhood events this semester" />
        {members.length === 0 ? (
          <EmptyState icon={<Users size={20} />} title="No members" />
        ) : (
          <div className="space-y-2">
            {[...members].sort((a, b) => b.rate - a.rate).slice(0, 15).map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-1">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{m.full_name}</p>
                  <ProgressBar
                    value={m.rate}
                    label={`${m.attended}/${m.total} events`}
                    color={m.attended >= semesterGoal ? "green" : m.rate >= 50 ? "yellow" : "red"}
                    size="sm"
                  />
                </div>
                <Badge
                  label={m.attended >= semesterGoal ? "On track" : "Below goal"}
                  color={m.attended >= semesterGoal ? "green" : "red"}
                />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
