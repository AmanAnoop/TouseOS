import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const metadata = { title: "Create organization" };
export const dynamic = "force-dynamic";

/** Add another workspace — auth required only when submitting (handled in wizard). */
export default function CreateOrgPage() {
  return <OnboardingWizard mode="create" allowBackToDashboard />;
}
