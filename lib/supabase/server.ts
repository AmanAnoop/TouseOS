/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/public-config";

export async function createClient() {
  const cookieStore = await cookies();
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createServerClient<any>(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAll(cookiesToSet: any[]) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cookiesToSet.forEach(({ name, value, options }: any) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server component — cookie setting handled by middleware
          }
        },
      },
    },
  );
}

export async function createServiceClient() {
  const url = getSupabaseUrl();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createServerClient<any>(
    url,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
      auth: { persistSession: false },
    },
  );
}
