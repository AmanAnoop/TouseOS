/** Client-safe check for common local setup mistakes. */
export function getSupabaseEnvStatus(): {
  configured: boolean;
  message?: string;
} {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "";

  if (!url || !key) {
    return {
      configured: false,
      message:
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or ANON_KEY) to .env.local, then restart npm run dev.",
    };
  }

  if (
    url.includes("your-project.supabase.co") ||
    key.includes("your-anon-key") ||
    key.includes("your-publishable-key")
  ) {
    return {
      configured: false,
      message:
        ".env.local still has placeholder Supabase values. Copy your Project URL and anon/publishable key from Supabase → Project Settings → API, then restart the dev server.",
    };
  }

  return { configured: true };
}
