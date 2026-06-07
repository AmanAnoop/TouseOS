"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();

  if (!publishableKey) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      appearance={clerkAppearance}
      signInUrl="/login"
      signUpUrl="/signup"
      afterSignInUrl="/home"
      afterSignUpUrl="/onboarding"
    >
      {children}
    </ClerkProvider>
  );
}
