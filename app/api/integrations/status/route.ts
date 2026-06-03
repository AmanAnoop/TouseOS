import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getIntegrationStatuses, isStripeConfigured } from "@/lib/integrations";

/** Live integration readiness for settings and comms (no secrets). */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const integrations = getIntegrationStatuses();

  let stripeReachable = false;
  if (isStripeConfigured()) {
    try {
      const { stripe } = await import("@/lib/stripe");
      await stripe.balance.retrieve();
      stripeReachable = true;
    } catch {
      stripeReachable = false;
    }
  }

  return NextResponse.json({
    integrations,
    stripe: {
      platformConfigured: isStripeConfigured(),
      reachable: stripeReachable,
    },
  });
}
