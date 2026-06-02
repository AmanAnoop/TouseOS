import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProductId, isRouteAllowed, productHomePath } from "@/lib/org-product";
import type { OrgType } from "@/types";

export async function requireOrgProduct(allowed: Array<"greek" | "sports" | "club">) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: m } = await supabase
    .from("org_members")
    .select("org_id, organizations(type)")
    .eq("user_id", user.id)
    .neq("status", "removed")
    .limit(1)
    .single();

  if (!m) redirect("/onboarding");

  const orgType = String(
    ((m.organizations as unknown) as Record<string, unknown>)?.type ?? "general_org",
  ) as OrgType;
  const product = getProductId(orgType);

  if (product === "university" || !allowed.includes(product)) {
    redirect(productHomePath(product === "university" ? "greek" : product));
  }

  return { orgId: m.org_id as string, orgType, product };
}

export async function getActiveOrgContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: m } = await supabase
    .from("org_members")
    .select("org_id, role, organizations(type, name)")
    .eq("user_id", user.id)
    .neq("status", "removed")
    .limit(1)
    .single();

  if (!m) return null;

  const orgType = String(
    ((m.organizations as unknown) as Record<string, unknown>)?.type ?? "general_org",
  );
  const orgName = String(
    ((m.organizations as unknown) as Record<string, unknown>)?.name ?? "Organization",
  );

  return {
    orgId: m.org_id as string,
    role: String(m.role ?? "general_member"),
    orgType,
    orgName,
    product: getProductId(orgType),
  };
}

export function assertRouteForOrg(orgType: string, pathname: string): boolean {
  return isRouteAllowed(orgType, pathname);
}
