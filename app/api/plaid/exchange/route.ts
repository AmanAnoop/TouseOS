import { NextResponse } from "next/server";
import { requireFinanceOfficer, getServiceDb } from "@/lib/finance-api";
import { exchangePlaidPublicToken } from "@/lib/plaid";
import { ingestPlaidTransactions } from "@/lib/finance-plaid-sync";

export async function POST(request: Request) {
  const { orgId, publicToken } = await request.json();
  if (!orgId || !publicToken) {
    return NextResponse.json({ error: "orgId and publicToken required" }, { status: 400 });
  }

  const auth = await requireFinanceOfficer(String(orgId));
  if (!auth.ok) return auth.response;

  const exchanged = await exchangePlaidPublicToken(String(publicToken));
  if ("error" in exchanged && exchanged.error) {
    return NextResponse.json({ error: exchanged.error }, { status: 503 });
  }
  if (!exchanged.accessToken || !exchanged.itemId) {
    return NextResponse.json({ error: "Invalid Plaid exchange response" }, { status: 502 });
  }

  const service = await getServiceDb();
  const now = new Date().toISOString();

  await service.from("plaid_connections").upsert({
    org_id: orgId,
    item_id: exchanged.itemId,
    access_token: exchanged.accessToken,
    institution_id: exchanged.institutionId ?? null,
    institution_name: exchanged.institutionName ?? null,
    status: "active",
    updated_at: now,
  });

  await service.from("finance_org_settings").upsert({
    org_id: orgId,
    plaid_status: "connected",
    plaid_institution_name: exchanged.institutionName ?? null,
    updated_at: now,
  });

  const ingest = await ingestPlaidTransactions(
    service,
    orgId,
    exchanged.accessToken,
    null,
  );

  if (ingest.error) {
    return NextResponse.json({
      connected: true,
      syncError: ingest.error,
      transactionCount: 0,
    });
  }

  const { data: recent } = await service
    .from("finance_transactions")
    .select("id, occurred_at, amount, description, merchant_name, category_key, pending_review, status")
    .eq("org_id", orgId)
    .eq("source", "plaid")
    .order("occurred_at", { ascending: false })
    .limit(50);

  return NextResponse.json({
    connected: true,
    institutionName: exchanged.institutionName,
    transactionCount: ingest.count,
    recentTransactions: recent ?? [],
    balances: "balances" in ingest ? ingest.balances : null,
  });
}
