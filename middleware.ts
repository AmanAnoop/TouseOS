import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { supabase, supabaseResponse } = createMiddlewareClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password");

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const isProtectedRoute =
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/signup") &&
    !pathname.startsWith("/forgot-password") &&
    !pathname.startsWith("/api/stripe/webhook") &&
    !pathname.startsWith("/api/twilio") &&
    !pathname.startsWith("/p/") &&
    !pathname.startsWith("/pay/") &&
    !pathname.startsWith("/join/") &&
    !pathname.startsWith("/_next") &&
    !pathname.startsWith("/favicon") &&
    !pathname.startsWith("/manifest");

  if (isProtectedRoute && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
