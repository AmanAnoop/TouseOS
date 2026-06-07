import { NextResponse, type NextRequest } from "next/server";
import {
  updateSupabaseSession,
  withSessionCookies,
} from "@/lib/supabase/middleware";

function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/ready") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/stripe/webhook") ||
    pathname.startsWith("/api/webhooks/") ||
    pathname.startsWith("/api/plaid/webhook") ||
    pathname.startsWith("/api/twilio") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/pay/") ||
    pathname.startsWith("/join/") ||
    pathname.startsWith("/donate/") ||
    pathname.startsWith("/f/") ||
    pathname.startsWith("/pnm-event/") ||
    pathname.startsWith("/api/forms/share") ||
    pathname.startsWith("/api/forms/responses/public") ||
    pathname.startsWith("/api/events/pnm-invite") ||
    pathname.startsWith("/api/events/pnm-rsvp") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/manifest")
  );
}

/** Supabase session is the source of truth — never gate routes with Clerk middleware. */
export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const { response: supabaseResponse, latestCookies, user } =
    await updateSupabaseSession(request);

  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/forgot-password");

  if (isAuthRoute && user) {
    const next = request.nextUrl.searchParams.get("next");
    const dest = next && next.startsWith("/") ? next : "/home";
    const redirect = NextResponse.redirect(new URL(dest, request.url));
    return withSessionCookies(redirect, latestCookies);
  }

  if (!isPublicPath(pathname) && !user) {
    const redirectUrl = new URL("/onboarding", request.url);
    redirectUrl.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(redirectUrl);
    return withSessionCookies(redirect, latestCookies);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
