import { NextResponse } from "next/server";
import {
  validateSupabaseBrowserConfig,
  validateSupabaseServerConfig,
} from "@/lib/supabase/public-config";

/** Public diagnostic — never returns secret values. */
export async function GET() {
  const server = validateSupabaseServerConfig();
  const browser = validateSupabaseBrowserConfig();

  return NextResponse.json({
    ok: server.ok,
    server: {
      ok: server.ok,
      keyKind: server.keyKind,
      projectRef: server.projectRef,
      urlSet: Boolean(server.url),
      keySet: Boolean(server.key),
      issues: server.issues,
    },
    browser: {
      ok: browser.ok,
      keyKind: browser.keyKind,
      urlSet: Boolean(browser.url),
      keySet: Boolean(browser.key),
      issues: browser.issues,
    },
    authViaApi: server.ok,
    vercelSteps: [
      "Vercel → Project → Settings → Environment Variables",
      "Add NEXT_PUBLIC_SUPABASE_URL = https://YOUR-REF.supabase.co",
      "Add NEXT_PUBLIC_SUPABASE_ANON_KEY = anon or publishable key (not service_role)",
      "Enable for Production + Preview, then Deployments → Redeploy",
    ],
    redeployHint:
      "NEXT_PUBLIC_* is embedded at build time. After adding variables, you must redeploy.",
  });
}
