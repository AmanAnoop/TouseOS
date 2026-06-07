import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ensureUserProfile } from "@/lib/ensure-user-profile";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/public-config";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/onboarding";

  if (!next.startsWith("/") || next.startsWith("//")) {
    next = "/onboarding";
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/login?error=supabase_not_configured", origin));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=auth_callback", origin));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(),
    {
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
            // setAll from Route Handler — safe to ignore if called from a context that cannot set cookies
          }
        },
      },
    },
  );

  const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback]", error.message);
    return NextResponse.redirect(new URL("/login?error=auth_callback", origin));
  }

  if (sessionData.user) {
    try {
      const service = await createServiceClient();
      await ensureUserProfile(service, sessionData.user);
    } catch (profileErr) {
      console.error("[auth/callback] profile", profileErr);
    }
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";

  if (!isLocal && forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${next}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
