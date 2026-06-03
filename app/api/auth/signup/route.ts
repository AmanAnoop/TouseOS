import { NextResponse } from "next/server";
import { friendlyAuthError } from "@/lib/auth-errors";
import {
  getPublicAppOrigin,
  validateSupabaseServerConfig,
} from "@/lib/supabase/public-config";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";

export async function POST(request: Request) {
  const config = validateSupabaseServerConfig();
  if (!config.ok) {
    return NextResponse.json(
      {
        error: "Supabase is not configured on the server.",
        issues: config.issues,
      },
      { status: 503 },
    );
  }

  let body: { email?: string; password?: string; fullName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = body.email?.trim();
  const password = body.password;
  const fullName = body.fullName?.trim();

  if (!email || !password || !fullName) {
    return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseRouteHandlerClient();
    const origin =
      getPublicAppOrigin(request.headers.get("origin") ?? undefined) ||
      new URL(request.url).origin;
    const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent("/onboarding")}`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo,
      },
    });

    if (error) {
      return NextResponse.json({ error: friendlyAuthError(error.message) }, { status: 400 });
    }

    if (data.user && !data.user.identities?.length) {
      return NextResponse.json(
        { error: "An account with this email already exists. Sign in instead." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      hasSession: Boolean(data.session),
      needsEmailConfirmation: !data.session,
    });
  } catch (e) {
    console.error("[api/auth/signup]", e);
    return NextResponse.json(
      { error: "Could not create account. Check server Supabase environment variables." },
      { status: 500 },
    );
  }
}
