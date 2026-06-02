import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

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
      .select("org_id")
      .eq("user_id", user.id)
      .neq("status", "removed")
      .limit(1)
      .maybeSingle();

    if (m) redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <OnboardingWizard mode={forceCreate ? "create" : "welcome"} allowBackToDashboard={forceCreate} />
    </div>
  );
}
