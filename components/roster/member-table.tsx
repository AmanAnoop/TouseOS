"use client";

import { useRouter } from "next/navigation";
import { Avatar, Badge, Table } from "@/components/ui";
import { cn, getStatusColor } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/permissions";
import type { MemberProfile } from "@/types";

interface MemberTableProps {
  members: MemberProfile[];
  loading?: boolean;
  className?: string;
}

export function MemberTable({ members, loading, className }: MemberTableProps) {
  const router = useRouter();

  if (loading) {
    return <div className={cn("h-48 rounded-xl bg-surface-2 animate-pulse", className)} />;
  }

  return (
    <div className={cn("hidden sm:block", className)}>
      <Table<MemberProfile & Record<string, unknown>>
        columns={[
          {
            key: "name",
            header: "Member",
            render: (m) => (
              <div className="flex items-center gap-2">
                <Avatar name={m.full_name} src={m.profile_photo_url ?? undefined} size="sm" />
                <div>
                  <p className="font-medium text-sm">{m.full_name}</p>
                  {m.preferred_name && (
                    <p className="text-xs text-muted-foreground">{m.preferred_name}</p>
                  )}
                </div>
              </div>
            ),
          },
          {
            key: "role",
            header: "Role",
            render: (m) => (
              <span className="text-sm">{(ROLE_LABELS as Record<string, string>)[m.role] ?? m.role}</span>
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (m) => (
              <Badge label={m.membership_status.replace("_", " ")} color={getStatusColor(m.membership_status) as "green"} />
            ),
          },
          {
            key: "payment",
            header: "Payment",
            render: (m) => (
              <Badge label={m.payment_status} color={m.payment_status === "current" ? "green" : "red"} />
            ),
          },
          {
            key: "attendance",
            header: "Attendance",
            render: (m) => (
              <span className="text-sm text-muted-foreground">{m.attendance_rate}%</span>
            ),
          },
        ]}
        data={members as (MemberProfile & Record<string, unknown>)[]}
        onRowClick={(m) => router.push(`/roster/${m.id}`)}
        emptyMessage="No members match your filters"
      />
    </div>
  );
}
