/* eslint-disable @typescript-eslint/no-explicit-any */
import { createBrowserClient } from "@supabase/ssr";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/public-config";

export {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
  validateSupabasePublicConfig,
} from "@/lib/supabase/public-config";

export function createClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!isSupabaseConfigured() || !url || !key) {
    return createBrowserClient<any>("https://invalid.supabase.co", "invalid-anon-key");
  }

  return createBrowserClient<any>(url, key);
}
