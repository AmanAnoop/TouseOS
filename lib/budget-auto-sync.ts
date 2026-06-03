import { createServiceClient } from "@/lib/supabase/server";
import { syncActiveOrgBudget } from "@/lib/budget-sync";

/** Fire-and-forget budget sync after finance mutations (uses service role). */
export async function triggerBudgetSyncForOrg(orgId: string, actorId?: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    const service = await createServiceClient();
    await syncActiveOrgBudget(service, orgId, actorId);
  } catch (err) {
    console.error("[budget-auto-sync]", orgId, err);
  }
}
