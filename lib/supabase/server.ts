import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createUtilServerClient } from "@/utils/supabase/server";

/** Server Components / Route Handlers — matches Supabase guide pattern. */
export async function createClient() {
  const cookieStore = await cookies();
  return createUtilServerClient(cookieStore);
}

export async function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return createServerClient(url, serviceKey, {
    cookies: { getAll: () => [], setAll: () => {} },
    auth: { persistSession: false },
  });
}
