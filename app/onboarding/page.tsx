import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { homePathForOrgType } from "@/lib/resolve-home";

export const metadata = { title: "Onboarding" };
export const dynamic = "force-dynamic";

export default async function OnboardingRoute({
  searchParams,
}: {
  searchParams: Promise<{ create?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding");

  const params = await searchParams;
  const forceCreate = params.create === "1";

  if (!forceCreate) {
    const { data: m } = await supabase
      .from("org_members")
      .select("org_id, organizations(type)")
      .eq("user_id", user.id)
      .neq("status", "removed")
      .limit(1)
      .maybeSingle();

    if (m) {
      const org = m.organizations as { type?: string } | { type?: string }[] | null;
      const orgType = Array.isArray(org) ? org[0]?.type : org?.type;
      redirect(homePathForOrgType(orgType));
    }
  }

  return <OnboardingWizard mode={forceCreate ? "create" : "welcome"} allowBackToDashboard={forceCreate} />;
}
