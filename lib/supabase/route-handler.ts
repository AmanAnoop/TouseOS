import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  getSupabaseAnonKeyForServer,
  getSupabaseUrlForServer,
} from "@/lib/supabase/public-config";

/** Supabase client for Route Handlers — reads session cookies and can set auth cookies on sign-in/up. */
export async function createSupabaseRouteHandlerClient() {
  const url = getSupabaseUrlForServer();
  const key = getSupabaseAnonKeyForServer();

  if (!url || !key) {
    throw new Error("Supabase is not configured on the server");
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[],
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a context that cannot set cookies
        }
      },
    },
  });
}
