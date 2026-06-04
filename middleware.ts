import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { isClerkEnabled } from "@/lib/clerk-config";
import {
  updateSupabaseSession,
  withSessionCookies,
} from "@/lib/supabase/middleware";

function isPublicPath(pathname: string): boolean {
  return (
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
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/manifest")
  );
}

const clerkPublicRoutes = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/login(.*)",
  "/signup(.*)",
  "/forgot-password(.*)",
  "/reset-password(.*)",
  "/terms(.*)",
  "/privacy(.*)",
  "/join(.*)",
  "/pay(.*)",
  "/donate(.*)",
  "/p(.*)",
  "/api/webhooks(.*)",
  "/api/stripe/webhook(.*)",
  "/api/plaid/webhook(.*)",
  "/api/ready(.*)",
  "/api/cron(.*)",
  "/api/twilio(.*)",
]);

async function supabaseMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const { response: supabaseResponse, latestCookies, user } =
    await updateSupabaseSession(request);

  if ((pathname === "/login" || pathname === "/signup") && isClerkEnabled()) {
    const clerkDest = pathname === "/signup" ? "/sign-up" : "/sign-in";
    const redirect = NextResponse.redirect(new URL(clerkDest, request.url));
    return withSessionCookies(redirect, latestCookies);
  }

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
    const signInPath = isClerkEnabled() ? "/sign-in" : "/login";
    const redirectUrl = new URL(signInPath, request.url);
    redirectUrl.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(redirectUrl);
    return withSessionCookies(redirect, latestCookies);
  }

  return supabaseResponse;
}

const clerkHandler = clerkMiddleware(async (auth, request) => {
  if (!clerkPublicRoutes(request)) {
    await auth.protect();
  }
});

export default async function middleware(
  request: NextRequest,
  event: import("next/server").NextFetchEvent,
) {
  if (isClerkEnabled()) {
    return clerkHandler(request, event);
  }
  return supabaseMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
