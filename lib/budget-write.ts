import type { SupabaseClient } from "@supabase/supabase-js";
import { forbidUnless, getMemberRole } from "@/lib/api-org-role";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/** Verify manage_budget, then return a client for budget mutations. */
export async function budgetWriteClient(
  userId: string,
  orgId: string,
): Promise<
  | { ok: true; db: SupabaseClient; role: string }
  | { ok: false; response: Response }
> {
  const auth = await createClient();
  const role = await getMemberRole(auth, userId, orgId);
  const denied = forbidUnless(role, "manage_budget");
  if (denied) return { ok: false, response: denied };

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const db = await createServiceClient();
    return { ok: true, db, role: role! };
  }

  return { ok: true, db: auth, role: role! };
}
