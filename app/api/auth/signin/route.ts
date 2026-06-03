import { NextResponse } from "next/server";
import { friendlyAuthError } from "@/lib/auth-errors";
import { validateSupabaseServerConfig } from "@/lib/supabase/public-config";
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

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = body.email?.trim();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseRouteHandlerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return NextResponse.json({ error: friendlyAuthError(error.message) }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/auth/signin]", e);
    return NextResponse.json({ error: "Could not sign in." }, { status: 500 });
  }
}
