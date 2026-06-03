import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_ORG_COOKIE } from "@/lib/active-org-cookie";
import { loadActiveMembership, type ActiveMembership } from "@/lib/active-org-membership";

/** Server components: resolve active org from cookie + memberships. */
export async function loadActiveMembershipServer(
  userId: string,
): Promise<ActiveMembership | null> {
  const cookieStore = await cookies();
  const preferredOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value ?? null;
  const supabase = await createClient();
  return loadActiveMembership(supabase, userId, preferredOrgId);
}
