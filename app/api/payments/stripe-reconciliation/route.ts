import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";
import { getOrgStripeDestination } from "@/lib/org-stripe";
import { reconcileStripePayments } from "@/lib/stripe-reconciliation";
import { isStripeConnectEnabled } from "@/lib/stripe-connect";

export async function GET(request: Request) {
  if (!isStripeConnectEnabled()) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .neq("status", "removed")
    .single();

  const role = String(membership?.role ?? "general_member") as RoleName;
  if (!can(role, "manage_payments")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const connectedAccountId = (await getOrgStripeDestination(supabase, orgId)) ?? null;

  const { data: payments, error } = await supabase
    .from("payments")
    .select("id, amount, paid_amount, status, stripe_payment_intent_id, paid_at, member_profiles(full_name)")
    .eq("org_id", orgId)
    .order("paid_at", { ascending: false })
    .limit(120);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const summary = await reconcileStripePayments(payments ?? [], connectedAccountId);

  return NextResponse.json(summary);
}
