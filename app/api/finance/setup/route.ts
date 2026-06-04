import { NextResponse } from "next/server";
import { requireFinanceOfficer, getServiceDb, ensureSemesterBudgetFromFinance } from "@/lib/finance-api";
import { getConnectAccountStatus, isStripeConnectEnabled } from "@/lib/stripe-connect";

export async function GET(request: Request) {
  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const auth = await requireFinanceOfficer(orgId);
  if (!auth.ok) return auth.response;

  const { data: settings } = await auth.supabase
    .from("finance_org_settings")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle();

  const { data: org } = await auth.supabase
    .from("organizations")
    .select("stripe_account_id, settings")
    .eq("id", orgId)
    .single();

  let stripe = {
    enabled: isStripeConnectEnabled(),
    connected: false,
    chargesEnabled: false,
    detailsSubmitted: false,
    dashboardUrl: null as string | null,
  };

  if (org?.stripe_account_id && stripe.enabled) {
    try {
      const status = await getConnectAccountStatus(org.stripe_account_id);
      stripe = {
        enabled: true,
        connected: true,
        chargesEnabled: status.chargesEnabled,
        detailsSubmitted: status.detailsSubmitted,
        dashboardUrl: `https://dashboard.stripe.com/${org.stripe_account_id}`,
      };
    } catch {
      stripe.connected = Boolean(org.stripe_account_id);
    }
  }

  const needsSetup = !settings?.setup_completed_at;
  const plaidExpired = settings?.plaid_status === "expired" || settings?.plaid_status === "error";

  return NextResponse.json({
    settings: settings ?? null,
    needsSetup,
    plaidExpired,
    stripe,
    setupPath: settings?.setup_path ?? null,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const orgId = String(body.orgId ?? "");
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const auth = await requireFinanceOfficer(orgId);
  if (!auth.ok) return auth.response;

  const setupPath = body.setupPath as string | undefined;
  const semesterDuesAmount = body.semesterDuesAmount != null ? Number(body.semesterDuesAmount) : undefined;
  const semesterDuesDueDate = body.semesterDuesDueDate as string | undefined;
  const semesterLabel = body.semesterLabel as string | undefined;
  const totalBudgetTarget = body.totalBudgetTarget != null ? Number(body.totalBudgetTarget) : undefined;
  const lateFeeAmount = body.lateFeeAmount != null ? Number(body.lateFeeAmount) : undefined;
  const lateFeeDaysAfterDue = body.lateFeeDaysAfterDue != null ? Number(body.lateFeeDaysAfterDue) : undefined;
  const balanceAlertThreshold = body.balanceAlertThreshold != null ? Number(body.balanceAlertThreshold) : undefined;
  const complete = Boolean(body.complete);
  const importRoster = Boolean(body.importRoster);

  const patch: Record<string, unknown> = {
    org_id: orgId,
    updated_at: new Date().toISOString(),
  };

  if (setupPath && ["stripe", "plaid", "both", "manual"].includes(setupPath)) {
    patch.setup_path = setupPath;
  }
  if (semesterDuesAmount != null && !Number.isNaN(semesterDuesAmount)) {
    patch.semester_dues_amount = semesterDuesAmount;
  }
  if (semesterDuesDueDate) patch.semester_dues_due_date = semesterDuesDueDate;
  if (semesterLabel) patch.semester_label = semesterLabel;
  if (lateFeeAmount != null) patch.late_fee_amount = lateFeeAmount;
  if (lateFeeDaysAfterDue != null) patch.late_fee_days_after_due = lateFeeDaysAfterDue;
  if (balanceAlertThreshold != null) patch.balance_alert_threshold = balanceAlertThreshold;
  if (complete) patch.setup_completed_at = new Date().toISOString();

  const { data: settings, error } = await auth.supabase
    .from("finance_org_settings")
    .upsert(patch, { onConflict: "org_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (complete && totalBudgetTarget != null) {
    const service = await getServiceDb();
    await ensureSemesterBudgetFromFinance(service, orgId, {
      label: semesterLabel,
      totalBudget: totalBudgetTarget,
    });
  }

  if (complete && importRoster && semesterDuesAmount != null && semesterDuesAmount > 0) {
    const service = await getServiceDb();
    const { data: members } = await service
      .from("member_profiles")
      .select("id")
      .eq("org_id", orgId)
      .in("membership_status", ["active", "new_member"]);

    const { data: item } = await service.from("payment_items").insert({
      org_id: orgId,
      title: settings?.semester_label ?? "Semester dues",
      amount: semesterDuesAmount,
      category: "dues",
      due_date: semesterDuesDueDate ?? null,
    }).select("id").single();

    if (item && members?.length) {
      const rows = members.map((m) => ({
        org_id: orgId,
        member_id: m.id,
        payment_item_id: item.id,
        amount: semesterDuesAmount,
        paid_amount: 0,
        status: "pending",
        due_date: semesterDuesDueDate ?? null,
        late_fee: Number(settings?.late_fee_amount ?? 0),
      }));
      await service.from("payments").insert(rows);
    }
  }

  return NextResponse.json({ settings });
}
