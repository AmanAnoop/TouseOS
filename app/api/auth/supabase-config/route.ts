import { NextResponse } from "next/server";
import { validateSupabasePublicConfig } from "@/lib/supabase/public-config";

/** Public diagnostic for auth pages — never returns secret key values. */
export async function GET() {
  const v = validateSupabasePublicConfig();

  return NextResponse.json({
    ok: v.ok,
    projectRef: v.projectRef,
    keyKind: v.keyKind,
    urlSet: Boolean(v.url),
    keySet: Boolean(v.key),
    issues: v.issues,
    redeployHint:
      "NEXT_PUBLIC_* variables are embedded at build time on Vercel. After changing them, trigger a new deployment.",
  });
}
