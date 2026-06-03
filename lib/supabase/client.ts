/* eslint-disable @typescript-eslint/no-explicit-any */
import { createBrowserClient } from "@supabase/ssr";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export { isSupabaseConfigured } from "@/lib/supabase/env";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!isSupabaseConfigured() || !url || !key) {
    return createBrowserClient<any>("https://invalid.supabase.co", "invalid-anon-key");
  }

  return createBrowserClient<any>(url, key);
}
