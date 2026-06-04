import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadActiveMembershipServer } from "@/lib/active-org-membership-server";
import { getProductId, productHomePath } from "@/lib/org-product";
import type { OrgType } from "@/types";

export async function requireOrgProduct(allowed: Array<"greek" | "sports" | "club">) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await loadActiveMembershipServer(user.id);
  if (!membership) redirect("/onboarding");

  const orgType = membership.orgType as OrgType;
  const product = getProductId(orgType);

  if (product === "university" || !allowed.includes(product)) {
    redirect(productHomePath(product === "university" ? "greek" : product));
  }

  return {
    orgId: membership.orgId,
    orgType,
    product,
    role: String(membership.role ?? "general_member"),
    userId: user.id,
  };
}
