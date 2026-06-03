import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import {
  getSupabaseAnonKeyForServer,
  getSupabaseUrlForServer,
  isSupabaseConfigured,
} from "@/lib/supabase/public-config";

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };

function applyCookies(target: NextResponse, cookiesToSet: CookieToSet[]) {
  for (const { name, value, options } of cookiesToSet) {
    target.cookies.set(name, value, options as Parameters<typeof target.cookies.set>[2]);
  }
}

/**
 * Refreshes the Supabase session and returns a NextResponse with updated auth cookies.
 * Passes through safely when Supabase env vars are not configured (e.g. misconfigured Vercel deploy).
 */
export async function updateSupabaseSession(request: NextRequest): Promise<{
  response: NextResponse;
  latestCookies: CookieToSet[];
  user: User | null;
}> {
  const url = getSupabaseUrlForServer();
  const anonKey = getSupabaseAnonKeyForServer();

  if (!isSupabaseConfigured() || !url || !anonKey) {
    return {
      response: NextResponse.next({ request }),
      latestCookies: [],
      user: null,
    };
  }

  let supabaseResponse = NextResponse.next({ request });
  let latestCookies: CookieToSet[] = [];
  let user: User | null = null;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        latestCookies = cookiesToSet;
        supabaseResponse = NextResponse.next({ request });
        applyCookies(supabaseResponse, cookiesToSet);
      },
    },
  });

  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (error) {
    console.error("[middleware] supabase.auth.getUser failed:", error);
  }

  return { response: supabaseResponse, latestCookies, user };
}

export function withSessionCookies(
  base: NextResponse,
  cookiesToSet: CookieToSet[],
): NextResponse {
  applyCookies(base, cookiesToSet);
  return base;
}
