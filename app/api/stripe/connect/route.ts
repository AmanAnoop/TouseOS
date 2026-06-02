import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createConnectOnboardingLink,
  createExpressConnectAccount,
  getConnectAccountStatus,
  isStripeConnectEnabled,
} from "@/lib/stripe-connect";

const OFFICER_ROLES = ["owner", "president", "treasurer", "advisor"];

async function assertOfficer(orgId: string, userId: string) {
  const supabase = await createClient();
  const { data: m } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .neq("status", "removed")
    .maybeSingle();
  if (!m || !OFFICER_ROLES.includes(String(m.role))) {
    return false;
  }
  return true;
}

export async function GET(request: Request) {
  if (!isStripeConnectEnabled()) {
    return NextResponse.json({ enabled: false, error: "Stripe Connect not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  if (!(await assertOfficer(orgId, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("stripe_account_id")
    .eq("id", orgId)
    .single();

  if (!org?.stripe_account_id) {
    return NextResponse.json({ connected: false, chargesEnabled: false, detailsSubmitted: false });
  }

  try {
    const status = await getConnectAccountStatus(org.stripe_account_id);
    return NextResponse.json({
      enabled: true,
      connected: true,
      accountId: status.id,
      chargesEnabled: status.chargesEnabled,
      payoutsEnabled: status.payoutsEnabled,
      detailsSubmitted: status.detailsSubmitted,
      requirementsDue: status.requirements,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stripe error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isStripeConnectEnabled()) {
    return NextResponse.json({ error: "Set STRIPE_SECRET_KEY and STRIPE_CONNECT_ENABLED" }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId } = await request.json();
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  if (!(await assertOfficer(orgId, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, stripe_account_id, contact_email")
    .eq("id", orgId)
    .single();

  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  let accountId = org.stripe_account_id as string | null;

  if (!accountId) {
    const account = await createExpressConnectAccount(
      org.contact_email ?? user.email ?? `org-${orgId}@touseos.local`,
    );
    accountId = account.id;
    const { error } = await supabase
      .from("organizations")
      .update({ stripe_account_id: accountId })
      .eq("id", orgId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase.from("audit_logs").insert({
      org_id: orgId,
      actor_id: user.id,
      action: "stripe_connect_account_created",
      resource_type: "organizations",
      resource_id: orgId,
      metadata: { stripe_account_id: accountId },
    });
  }

  const url = await createConnectOnboardingLink({ accountId, orgId });

  return NextResponse.json({ url, accountId });
}
