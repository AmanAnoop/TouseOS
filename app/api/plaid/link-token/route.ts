import { NextResponse } from "next/server";
import { requireFinanceOfficer } from "@/lib/finance-api";
import { createPlaidLinkToken } from "@/lib/plaid";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const orgId = String(body.orgId ?? "");
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const auth = await requireFinanceOfficer(orgId);
  if (!auth.ok) return auth.response;

  const result = await createPlaidLinkToken({
    userId: auth.userId,
    orgId,
  });

  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  return NextResponse.json({
    linkToken: result.linkToken,
    expiration: result.expiration,
  });
}
