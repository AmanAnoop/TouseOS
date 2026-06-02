import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseKey, getSupabaseUrl } from "@/lib/supabase/config";

export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseKey());
}
