/** Shared reimbursement approval rules (UI + API). */

export const DEFAULT_REIMBURSEMENT_THRESHOLD = 250;

export type ReimbursementApprovalInput = {
  status?: string;
  approvalType?: "treasurer" | "president";
  rejectionReason?: string;
};

export type ReimbursementForApproval = {
  amount: number | string;
  status: string;
  approval_threshold?: number | string | null;
};

export function reimbursementThreshold(reimb: ReimbursementForApproval): number {
  const t = reimb.approval_threshold;
  if (t != null && !Number.isNaN(Number(t))) return Number(t);
  return DEFAULT_REIMBURSEMENT_THRESHOLD;
}

export function buildReimbursementUpdates(
  reimb: ReimbursementForApproval,
  input: ReimbursementApprovalInput,
  reviewerId: string,
): { updates: Record<string, unknown>; toastMessage?: string } {
  const now = new Date().toISOString();
  const threshold = reimbursementThreshold(reimb);
  const amount = Number(reimb.amount);

  if (input.approvalType === "treasurer") {
    const updates: Record<string, unknown> = { treasurer_approved_at: now };
    if (amount <= threshold) {
      updates.status = "approved";
      updates.reviewed_by = reviewerId;
      updates.reviewed_at = now;
      return { updates, toastMessage: "Treasurer approved" };
    }
    return {
      updates,
      toastMessage: `Treasurer approved — president approval required above $${threshold}`,
    };
  }

  if (input.approvalType === "president") {
    return {
      updates: {
        president_approved_at: now,
        status: "approved",
        reviewed_by: reviewerId,
        reviewed_at: now,
      },
      toastMessage: "President approved",
    };
  }

  const status = input.status;
  if (!status) return { updates: {} };

  if (status === "rejected" || status === "needs_info") {
    const updates: Record<string, unknown> = { status };
    if (input.rejectionReason) updates.rejection_reason = input.rejectionReason;
    return { updates };
  }

  if (status === "paid") {
    return { updates: { status: "paid", paid_at: now } };
  }

  if (status === "approved") {
    return {
      updates: {
        status: "approved",
        reviewed_by: reviewerId,
        reviewed_at: now,
      },
    };
  }

  return { updates: { status } };
}

export function needsPresidentApproval(reimb: ReimbursementForApproval): boolean {
  return Number(reimb.amount) > reimbursementThreshold(reimb);
}
