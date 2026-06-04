import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { ingestPlaidTransactions } from "@/lib/finance-plaid-sync";

/** Plaid transaction sync — webhook-driven, not polled from the client. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const webhookType = String(body.webhook_type ?? "");
  const webhookCode = String(body.webhook_code ?? "");
  const itemId = body.item_id as string | undefined;

  if (!itemId) {
    return NextResponse.json({ received: true });
  }

  const supabase = await createServiceClient();

  const { data: conn } = await supabase
    .from("plaid_connections")
    .select("org_id, access_token, transactions_cursor, status")
    .eq("item_id", itemId)
    .maybeSingle();

  if (!conn?.access_token || conn.status === "revoked") {
    return NextResponse.json({ received: true });
  }

  const orgId = conn.org_id as string;

  if (
    webhookType === "TRANSACTIONS"
    && (webhookCode === "SYNC_UPDATES_AVAILABLE" || webhookCode === "DEFAULT_UPDATE" || webhookCode === "INITIAL_UPDATE")
  ) {
    await ingestPlaidTransactions(
      supabase,
      orgId,
      conn.access_token,
      conn.transactions_cursor,
    );
  }

  if (webhookType === "ITEM" && (webhookCode === "ERROR" || webhookCode === "USER_PERMISSION_REVOKED")) {
    await supabase.from("plaid_connections").update({
      status: webhookCode === "USER_PERMISSION_REVOKED" ? "revoked" : "error",
      updated_at: new Date().toISOString(),
    }).eq("item_id", itemId);

    await supabase.from("finance_org_settings").upsert({
      org_id: orgId,
      plaid_status: webhookCode === "USER_PERMISSION_REVOKED" ? "expired" : "error",
      updated_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({ received: true });
}
