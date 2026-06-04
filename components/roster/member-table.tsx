"use client";

import { useRouter } from "next/navigation";
import { Badge, MemberIdentity, Table } from "@/components/ui";
import { cn, getStatusColor } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/permissions";
import type { MemberProfile } from "@/types";

interface MemberTableProps {
  members: MemberProfile[];
  loading?: boolean;
  className?: string;
  showPayment?: boolean;
}

export function MemberTable({ members, loading, className, showPayment = false }: MemberTableProps) {
  const router = useRouter();

  const columns = [
    {
      key: "name",
      header: "Member",
      mobilePrimary: true,
      render: (m: MemberProfile) => (
        <MemberIdentity
          name={m.full_name}
          src={m.profile_photo_url}
          subtitle={m.preferred_name ?? undefined}
          size="sm"
        />
      ),
    },
    {
      key: "class",
      header: "Class",
      render: (m: MemberProfile) => (
        <span className="text-sm text-muted-foreground">{m.class_year ?? m.graduation_year ?? "—"}</span>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (m: MemberProfile) => (
        <span className="text-sm">{(ROLE_LABELS as Record<string, string>)[m.role] ?? m.role}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (m: MemberProfile) => (
        <Badge label={m.membership_status.replace("_", " ")} color={getStatusColor(m.membership_status) as "green"} />
      ),
    },
  ] as const;

  const paymentColumn = {
    key: "payment",
    header: "Payment",
    render: (m: MemberProfile) => (
      <Badge label={m.payment_status} color={m.payment_status === "current" ? "green" : "red"} />
    ),
  } as const;

  const attendanceColumn = {
    key: "attendance",
    header: "Attendance",
    render: (m: MemberProfile) => (
      <span className="text-sm text-muted-foreground">{m.attendance_rate}%</span>
    ),
  } as const;

  const allColumns = [
    ...columns,
    ...(showPayment ? [paymentColumn] : []),
    attendanceColumn,
  ];

  return (
    <div className={cn(className)}>
      <Table<MemberProfile & Record<string, unknown>>
        columns={allColumns}
        data={members as (MemberProfile & Record<string, unknown>)[]}
        loading={loading}
        rowKey={(m) => m.id}
        onRowClick={(m) => router.push(`/roster/${m.id}`)}
        emptyMessage="No members match your filters"
      />
    </div>
  );
}
