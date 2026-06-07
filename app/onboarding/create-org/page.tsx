import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { OnboardingRegalTheme } from "@/components/onboarding/onboarding-regal-theme";

export const metadata = { title: "Create organization" };
export const dynamic = "force-dynamic";

/** Add another workspace — auth required only when submitting (handled in wizard). */
export default function CreateOrgPage() {
  return (
    <>
      <OnboardingRegalTheme />
      <OnboardingWizard mode="create" allowBackToDashboard />
    </>
  );
}
