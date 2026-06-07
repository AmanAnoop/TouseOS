import { NextResponse } from "next/server";
import { requireFinanceOfficer } from "@/lib/finance-api";
import { isPlaidConfigured } from "@/lib/plaid";

export async function GET(request: Request) {
  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const auth = await requireFinanceOfficer(orgId);
  if (!auth.ok) return auth.response;

  const { data: settings } = await auth.supabase
    .from("finance_org_settings")
    .select("plaid_status, plaid_institution_name, plaid_last_synced_at, plaid_balance_current")
    .eq("org_id", orgId)
    .maybeSingle();

  const status = settings?.plaid_status ?? "disconnected";
  const connected = status === "connected";

  return NextResponse.json({
    plaidConfigured: isPlaidConfigured(),
    connected,
    status,
    institutionName: settings?.plaid_institution_name ?? null,
    lastSyncedAt: settings?.plaid_last_synced_at ?? null,
    balanceCurrent: settings?.plaid_balance_current ?? null,
    needsReconnect: status === "expired" || status === "error",
  });
}
