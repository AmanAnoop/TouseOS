import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeBudgetRecord } from "@/lib/budget-api";
import { forbidUnless, getMemberRole } from "@/lib/api-org-role";
import { applyBudgetSync } from "@/lib/budget-sync";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, budgetId } = await request.json();
  if (!orgId || !budgetId) {
    return NextResponse.json({ error: "orgId and budgetId required" }, { status: 400 });
  }

  const role = await getMemberRole(supabase, user.id, String(orgId));
  const denied = forbidUnless(role, "manage_budget");
  if (denied) return denied;

  try {
    const { updates, ledger, budget } = await applyBudgetSync(supabase, orgId, budgetId, {
      actorId: user.id,
    });

    return NextResponse.json({
      budget: budget ? normalizeBudgetRecord(budget as Record<string, unknown>) : null,
      updates,
      ledger,
      summary: {
        totalCollected: ledger.totalCollected,
        reimbursementsPaid: ledger.totalPaidReimbursements,
        approvedUnpaid: ledger.approvedReimbursementsUnpaid,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
