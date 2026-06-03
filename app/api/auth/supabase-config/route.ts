import { NextResponse } from "next/server";
import {
  getSupabaseEnvPresence,
  validateSupabaseBrowserConfig,
  validateSupabaseServerConfig,
} from "@/lib/supabase/public-config";

/** Public diagnostic — never returns secret values. */
export async function GET() {
  const server = validateSupabaseServerConfig();
  const browser = validateSupabaseBrowserConfig();
  const envPresent = getSupabaseEnvPresence();

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
    envPresent,
    requiredInVercel: [
      { name: "NEXT_PUBLIC_SUPABASE_URL", example: "https://YOUR-REF.supabase.co" },
      {
        name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
        example: "sb_publishable_... (from Supabase → API Keys → Publishable)",
      },
    ],
    neverPutInNextPublic: ["sb_secret_...", "service_role", "SUPABASE_SERVICE_ROLE_KEY"],
    authViaApi: server.ok,
    redeployHint:
      "After changing any NEXT_PUBLIC_* variable in Vercel, go to Deployments → Redeploy (required).",
  });
}
