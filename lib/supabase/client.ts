/* eslint-disable @typescript-eslint/no-explicit-any */
import { createBrowserClient } from "@supabase/ssr";
import {
  getSupabaseAnonKeyForBrowser,
  getSupabaseUrlForBrowser,
  isSupabaseConfigured,
} from "@/lib/supabase/public-config";

export {
  getSupabaseAnonKeyForBrowser,
  getSupabaseUrlForBrowser,
  isSupabaseConfigured,
  validateSupabaseBrowserConfig,
  validateSupabaseServerConfig,
} from "@/lib/supabase/public-config";

export function createClient() {
  const url = getSupabaseUrlForBrowser();
  const key = getSupabaseAnonKeyForBrowser();

  if (!isSupabaseConfigured() || !url || !key) {
    return createBrowserClient<any>("https://invalid.supabase.co", "invalid-anon-key");
  }

  return createBrowserClient<any>(url, key);
}
