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
        expected: "001 through 057 in supabase/migrations/",
        latest: "058_photo_notify_vp.sql",
        seedDeprecated: "005_seed.sql (demo removed — use 033_remove_demo_org.sql to clean old DBs)",
        doc: "supabase/APPLY_MIGRATIONS.md",
      },
      webhooks: {
        stripe: "/api/stripe/webhook",
        twilio: "/api/twilio/webhook",
        plaid: "/api/webhooks/plaid",
      },
      cron: {
        paths: [
          "/api/cron/process-scheduled",
          "/api/cron/overdue-dues",
          "/api/cron/recurring-dues",
          "/api/cron/sync-stripe-connect",
          "/api/cron/tasks-due-soon",
          "/api/cron/recurring-tasks",
          "/api/cron/social-calendar-reminders",
          "/api/cron/event-reminders",
          "/api/cron/forms-due",
          "/api/cron/recurring-housing-rent",
        ],
        auth: "Authorization: Bearer <CRON_SECRET>",
      },
    },
    { status },
  );
}
