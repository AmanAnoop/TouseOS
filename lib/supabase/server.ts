import { createServerClient } from "@supabase/ssr";
import { getSupabaseUrl } from "@/lib/supabase/config";
import { createClient as createUtilsServerClient } from "@/utils/supabase/server";

export async function createClient() {
  return createUtilsServerClient();
}

export async function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return createServerClient(getSupabaseUrl(), serviceKey, {
    cookies: { getAll: () => [], setAll: () => {} },
    auth: { persistSession: false },
  });
}
