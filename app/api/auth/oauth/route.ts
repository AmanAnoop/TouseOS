import { NextResponse, type NextRequest } from "next/server";
import { friendlyAuthError } from "@/lib/auth-errors";
import {
  getPublicAppOrigin,
  validateSupabaseServerConfig,
} from "@/lib/supabase/public-config";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";

const PROVIDERS = new Set(["google", "apple"]);

function sanitizeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/home";
  }
  return next;
}

/** Start Google or Apple OAuth — redirects to the provider. */
export async function GET(request: NextRequest) {
  const config = validateSupabaseServerConfig();
  if (!config.ok) {
    return NextResponse.redirect(
      new URL("/login?error=supabase_not_configured", request.url),
    );
  }

  const { searchParams } = request.nextUrl;
  const provider = searchParams.get("provider")?.toLowerCase();
  const next = sanitizeNext(searchParams.get("next"));

  if (!provider || !PROVIDERS.has(provider)) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_invalid_provider", request.url),
    );
  }

  try {
    const supabase = await createSupabaseRouteHandlerClient();
    const origin =
      getPublicAppOrigin(request.headers.get("origin") ?? undefined) ||
      request.nextUrl.origin;
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as "google" | "apple",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        ...(provider === "google"
          ? { queryParams: { access_type: "offline", prompt: "consent" } }
          : {}),
      },
    });

    if (error) {
      const msg = encodeURIComponent(friendlyAuthError(error.message));
      return NextResponse.redirect(new URL(`/login?error=oauth&message=${msg}`, request.url));
    }

    if (!data?.url) {
      return NextResponse.redirect(new URL("/login?error=oauth", request.url));
    }

    return NextResponse.redirect(data.url);
  } catch (e) {
    console.error("[api/auth/oauth]", e);
    return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  }
}
