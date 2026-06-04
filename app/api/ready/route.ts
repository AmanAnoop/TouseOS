import { NextResponse } from "next/server";
import { getLaunchReadiness } from "@/lib/launch-env";

/** Public ops endpoint — no secrets, no DB. Use for deploy smoke checks. */
export async function GET() {
  const readiness = getLaunchReadiness();
  const status = readiness.readyForPilot ? 200 : 503;

  return NextResponse.json(
    {
      service: "touseos",
      status: readiness.readyForPilot ? "ok" : "degraded",
      env: readiness,
      migrations: {
        expected: "001 through 027 in supabase/migrations/",
        seedDeprecated: "005_seed.sql (demo removed — use 033_remove_demo_org.sql to clean old DBs)",
        doc: "docs/launch-checklist.md",
      },
      webhooks: {
        stripe: "/api/stripe/webhook",
        twilio: "/api/twilio/webhook",
      },
      cron: {
        paths: [
          "/api/cron/process-scheduled",
          "/api/cron/overdue-dues",
          "/api/cron/recurring-dues",
          "/api/cron/sync-stripe-connect",
        ],
        auth: "Authorization: Bearer <CRON_SECRET>",
      },
    },
    { status },
  );
}
