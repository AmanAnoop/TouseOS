"use client";

import { useRouter } from "next/navigation";
import { Badge, MemberIdentity, Table } from "@/components/ui";
import { cn, formatCurrency, getStatusColor } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/permissions";
import type { MemberProfile } from "@/types";

type MemberWithDues = MemberProfile & {
  dues_summary?: {
    amountDue: number;
    amountPaid: number;
    balance: number;
    overdue: boolean;
  } | null;
};

interface MemberTableProps {
  members: MemberWithDues[];
  loading?: boolean;
  className?: string;
  showPayment?: boolean;
  showDuesDetail?: boolean;
  showInviteMeta?: boolean;
}

export function MemberTable({
  members,
  loading,
  className,
  showPayment = false,
  showDuesDetail = false,
  showInviteMeta = false,
}: MemberTableProps) {
  const router = useRouter();

  const columns = [
    {
      key: "name",
      header: "Member",
      mobilePrimary: true,
      render: (m: MemberWithDues) => (
        <MemberIdentity
          name={m.full_name}
          src={m.profile_photo_url}
          subtitle={showInviteMeta ? m.email : (m.preferred_name ?? undefined)}
          size="sm"
        />
      ),
    },
    {
      key: "class",
      header: "Class",
      render: (m: MemberWithDues) => (
        <span className="text-sm text-muted-foreground">{m.class_year ?? m.graduation_year ?? "—"}</span>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (m: MemberWithDues) => (
        <span className="text-sm">{(ROLE_LABELS as Record<string, string>)[m.role] ?? m.role}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (m: MemberWithDues) => (
        <Badge label={m.membership_status.replace("_", " ")} color={getStatusColor(m.membership_status) as "green"} />
      ),
    },
  ] as const;

  const paymentColumn = {
    key: "payment",
    header: "Payment",
    render: (m: MemberWithDues) => (
      <Badge label={m.payment_status} color={m.payment_status === "current" ? "green" : "red"} />
    ),
  } as const;

  const duesDetailColumn = {
    key: "dues",
    header: "Dues balance",
    render: (m: MemberWithDues) => {
      const d = m.dues_summary;
      if (!d || d.balance <= 0) {
        return <span className="text-sm text-green-600">Paid</span>;
      }
      return (
        <div className="text-sm">
          <span className={d.overdue ? "text-red-600 font-medium" : "text-foreground"}>
            {formatCurrency(d.balance)}
          </span>
          {d.overdue && (
            <Badge label="Overdue" color="red" className="ml-2" />
          )}
        </div>
      );
    },
  } as const;

  const attendanceColumn = {
    key: "attendance",
    header: "Attendance",
    render: (m: MemberWithDues) => (
      <span className="text-sm text-muted-foreground">{m.attendance_rate}%</span>
    ),
  } as const;

  const allColumns = [
    ...columns,
    ...(showPayment ? [paymentColumn] : []),
    ...(showDuesDetail ? [duesDetailColumn] : []),
    ...(showInviteMeta ? [] : [attendanceColumn]),
  ];

  return (
    <div className={cn(className)}>
      <Table<MemberWithDues & Record<string, unknown>>
        columns={allColumns}
        data={members as (MemberWithDues & Record<string, unknown>)[]}
        loading={loading}
        rowKey={(m) => m.id}
        onRowClick={showInviteMeta ? undefined : (m) => router.push(`/roster/${m.id}`)}
        emptyMessage="No members match your filters"
      />
    </div>
  );
}
