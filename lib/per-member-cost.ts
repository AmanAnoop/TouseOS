import type { MemberProfile } from "@/types";

export interface MemberCostRow {
  memberId: string;
  fullName: string;
  membershipStatus: string;
  duesPaid: number;
  duesOwed: number;
  reimbSubmitted: number;
  estimatedChapterCost: number;
}

export interface PaymentForCost {
  member_id: string | null;
  amount: number;
  paid_amount: number;
  status: string;
}

export interface ReimbForCost {
  submitted_by: string | null;
  amount: number;
  status: string;
}

export function computePerMemberCost(
  members: MemberProfile[],
  payments: PaymentForCost[],
  reimbursements: ReimbForCost[],
  totalChapterSpend: number,
): MemberCostRow[] {
  const active = members.filter((m) =>
    ["active", "new_member"].includes(m.membership_status),
  );
  const activeCount = Math.max(active.length, 1);

  const spendPerMember = totalChapterSpend / activeCount;

  return active.map((m) => {
    const memberPayments = payments.filter((p) => p.member_id === m.id);
    const duesPaid = memberPayments
      .filter((p) => p.status === "paid")
      .reduce((s, p) => s + Number(p.paid_amount), 0);
    const duesOwed = memberPayments
      .filter((p) => !["paid", "waived", "refunded"].includes(p.status))
      .reduce((s, p) => s + Math.max(0, Number(p.amount) - Number(p.paid_amount)), 0);

    const reimbSubmitted = reimbursements
      .filter((r) => r.submitted_by === m.user_id && r.status !== "denied")
      .reduce((s, r) => s + Number(r.amount), 0);

    return {
      memberId: m.id,
      fullName: m.full_name,
      membershipStatus: m.membership_status,
      duesPaid,
      duesOwed,
      reimbSubmitted,
      estimatedChapterCost: Math.round(spendPerMember * 100) / 100,
    };
  }).sort((a, b) => b.duesOwed - a.duesOwed);
}
