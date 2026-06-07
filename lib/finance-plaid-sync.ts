import type { SupabaseClient } from "@supabase/supabase-js";
import { suggestCategory } from "@/lib/finance-categories";
import { fetchPlaidBalances, syncPlaidTransactionsForOrg } from "@/lib/plaid";

/** Ingest Plaid transactions into finance_transactions (service client). */
export async function ingestPlaidTransactions(
  supabase: SupabaseClient,
  orgId: string,
  accessToken: string,
  cursor?: string | null,
) {
  const sync = await syncPlaidTransactionsForOrg({ accessToken, cursor });
  if ("error" in sync && sync.error) {
    return { error: sync.error, count: 0 };
  }

  const rows = sync.added.map((t) => {
    const desc = t.name;
    const merchant = t.merchantName;
    const category = suggestCategory(desc, merchant);
    const amount = -t.amount;
    return {
      org_id: orgId,
      source: "plaid",
      external_id: t.transactionId,
      occurred_at: new Date(t.date).toISOString(),
      amount,
      description: desc,
      merchant_name: merchant,
      category_key: category,
      status: t.pending ? "pending" : "posted",
      pending_review: category === "misc",
      idempotency_key: `plaid:${t.transactionId}`,
      metadata: { account_id: t.accountId, pending: t.pending },
    };
  });

  let inserted = 0;
  for (const row of rows) {
    const { error } = await supabase.from("finance_transactions").upsert(row, {
      onConflict: "org_id,idempotency_key",
      ignoreDuplicates: false,
    });
    if (!error) inserted += 1;
  }

  const balances = await fetchPlaidBalances(accessToken);
  const now = new Date().toISOString();

  await supabase.from("plaid_connections").update({
    transactions_cursor: sync.cursor,
    last_synced_at: now,
    status: "active",
    updated_at: now,
  }).eq("org_id", orgId);

  if (!("error" in balances)) {
    await supabase.from("finance_org_settings").upsert({
      org_id: orgId,
      plaid_status: "connected",
      plaid_last_synced_at: now,
      plaid_balance_current: balances.current,
      plaid_balance_available: balances.available,
      updated_at: now,
    });
  } else {
    await supabase.from("finance_org_settings").upsert({
      org_id: orgId,
      plaid_status: "connected",
      plaid_last_synced_at: now,
      updated_at: now,
    });
  }

  return { count: inserted, cursor: sync.cursor, balances };
}
