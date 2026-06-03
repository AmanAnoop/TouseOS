import { OnboardingRegalTheme } from "@/components/onboarding/onboarding-regal-theme";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen theme-regal bg-background flex flex-col items-center justify-center p-4">
      <OnboardingRegalTheme />
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center justify-center gap-2 mb-8 text-center">
          <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-serif font-bold text-lg shadow-card-md">
            Τ
          </div>
          <span className="font-serif text-2xl font-semibold text-foreground tracking-tight">TouseOS</span>
          <p className="text-xs text-muted-foreground max-w-xs">
            Your chapter command center — refined for fraternity & sorority life.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
