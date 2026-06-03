import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_ORG_COOKIE } from "@/lib/active-org-cookie";
import { homePathForOrgType } from "@/lib/resolve-home";

/** Resolves the correct product home for the active (or first) org. */
export default async function HomeRedirectPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;

  let query = supabase
    .from("org_members")
    .select("org_id, organizations(type)")
    .eq("user_id", user.id)
    .neq("status", "removed");

  if (activeOrgId) {
    query = query.eq("org_id", activeOrgId);
  }

  const { data: membership } = await query.limit(1).maybeSingle();

  if (!membership) redirect("/onboarding");

  const org = membership.organizations as { type?: string } | { type?: string }[] | null;
  const orgType = Array.isArray(org) ? org[0]?.type : org?.type;
  redirect(homePathForOrgType(orgType));
}
