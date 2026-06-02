import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isStripeConnectEnabled } from "@/lib/stripe-connect";
import { syncOrgStripeConnectSettings } from "@/lib/stripe-connect-sync";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service credentials missing");
  return createClient(url, key);
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isStripeConnectEnabled()) {
    return NextResponse.json({ skipped: true, reason: "Stripe Connect disabled" });
  }

  const supabase = getServiceClient();
  const { data: orgs, error } = await supabase
    .from("organizations")
    .select("id, stripe_account_id")
    .not("stripe_account_id", "is", null)
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let synced = 0;
  const failures: Array<{ orgId: string; error: string }> = [];

  for (const org of orgs ?? []) {
    try {
      await syncOrgStripeConnectSettings(supabase, org.id, org.stripe_account_id as string);
      synced += 1;
    } catch (e) {
      failures.push({
        orgId: org.id,
        error: e instanceof Error ? e.message : "sync failed",
      });
    }
  }

  return NextResponse.json({
    synced,
    total: orgs?.length ?? 0,
    failures,
  });
}
