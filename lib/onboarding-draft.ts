/** Persist onboarding wizard state across signup/login redirects. */

export const ONBOARDING_DRAFT_KEY = "touse_onboarding_draft";

export interface OnboardingDraft {
  step: number;
  orgType: string;
  inviteCode: string;
  form: {
    name: string;
    campus: string;
    councilOrLeague: string;
    contactEmail: string;
    sportType?: string;
  };
  identity: {
    universityId: string;
    greekAffiliationId: string;
    primaryColor: string;
    secondaryColor: string;
  };
  pendingAction?: "create" | "join";
}

export function saveOnboardingDraft(draft: OnboardingDraft): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
}

export function loadOnboardingDraft(): OnboardingDraft | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(ONBOARDING_DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OnboardingDraft;
  } catch {
    return null;
  }
}

export function clearOnboardingDraft(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ONBOARDING_DRAFT_KEY);
}
