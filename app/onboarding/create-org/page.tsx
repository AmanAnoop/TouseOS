import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const metadata = { title: "Create organization" };
export const dynamic = "force-dynamic";

/** Create another workspace (sidebar) or first org if none yet */
export default async function CreateOrgPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding/create-org");

  return <OnboardingWizard mode="create" allowBackToDashboard />;
}
