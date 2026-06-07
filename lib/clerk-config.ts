/** Clerk is optional until keys are set — Supabase auth remains the fallback. */

export function isClerkEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
    && process.env.CLERK_SECRET_KEY?.trim(),
  );
}
