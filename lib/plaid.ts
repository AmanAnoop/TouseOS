import "server-only";

import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
} from "plaid";

import { getPlatformSecretSync } from "@/lib/platform-secrets";
import { isPlaidConfigured } from "@/lib/integrations";
export { isPlaidConfigured };

function plaidEnv() {
  const env = (getPlatformSecretSync("PLAID_ENV") ?? "sandbox").toLowerCase();
  if (env === "production") return PlaidEnvironments.production;
  if (env === "development") return PlaidEnvironments.development;
  return PlaidEnvironments.sandbox;
}

let client: PlaidApi | null = null;

export function getPlaidClient(): PlaidApi | null {
  if (!isPlaidConfigured()) return null;
  if (!client) {
    const configuration = new Configuration({
      basePath: plaidEnv(),
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": getPlatformSecretSync("PLAID_CLIENT_ID")!,
          "PLAID-SECRET": getPlatformSecretSync("PLAID_SECRET")!,
        },
      },
    });
    client = new PlaidApi(configuration);
  }
  return client;
}

export async function createPlaidLinkToken(opts: {
  userId: string;
  orgId: string;
  accessToken?: string;
}) {
  const plaid = getPlaidClient();
  if (!plaid) {
    return { error: "Plaid is not configured. Set PLAID_CLIENT_ID and PLAID_SECRET." };
  }

  const webhook = process.env.PLAID_WEBHOOK_URL
    ?? `${process.env.NEXT_PUBLIC_APP_URL}/api/plaid/webhook`;

  const res = await plaid.linkTokenCreate({
    user: { client_user_id: `${opts.userId}:${opts.orgId}` },
    client_name: "TouseOS",
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: "en",
    webhook,
    ...(opts.accessToken ? { access_token: opts.accessToken } : {}),
  });

  return { linkToken: res.data.link_token, expiration: res.data.expiration };
}

export async function exchangePlaidPublicToken(publicToken: string) {
  const plaid = getPlaidClient();
  if (!plaid) return { error: "Plaid not configured" };

  const exchange = await plaid.itemPublicTokenExchange({ public_token: publicToken });
  const accessToken = exchange.data.access_token;
  const itemId = exchange.data.item_id;

  const item = await plaid.itemGet({ access_token: accessToken });
  const institutionId = item.data.item.institution_id ?? undefined;
  let institutionName: string | undefined;
  if (institutionId) {
    try {
      const inst = await plaid.institutionsGetById({
        institution_id: institutionId,
        country_codes: [CountryCode.Us],
      });
      institutionName = inst.data.institution.name;
    } catch {
      institutionName = institutionId;
    }
  }

  return { accessToken, itemId, institutionId, institutionName };
}

export async function syncPlaidTransactionsForOrg(opts: {
  accessToken: string;
  cursor?: string | null;
}) {
  const plaid = getPlaidClient();
  if (!plaid) return { error: "Plaid not configured", added: [] as PlaidTx[], cursor: null };

  const added: PlaidTx[] = [];
  let cursor = opts.cursor ?? undefined;
  let hasMore = true;

  while (hasMore) {
    const res = await plaid.transactionsSync({
      access_token: opts.accessToken,
      cursor,
      count: 500,
    });
    for (const t of res.data.added) {
      added.push({
        transactionId: t.transaction_id,
        accountId: t.account_id,
        amount: t.amount,
        date: t.date,
        name: t.name,
        merchantName: t.merchant_name ?? null,
        pending: t.pending,
      });
    }
    cursor = res.data.next_cursor;
    hasMore = res.data.has_more;
  }

  return { added, cursor: cursor ?? null };
}

export async function fetchPlaidBalances(accessToken: string) {
  const plaid = getPlaidClient();
  if (!plaid) return { error: "Plaid not configured" };

  const res = await plaid.accountsBalanceGet({ access_token: accessToken });
  let current = 0;
  let available = 0;
  for (const acct of res.data.accounts) {
    current += acct.balances.current ?? 0;
    available += acct.balances.available ?? acct.balances.current ?? 0;
  }
  return { current, available };
}

export interface PlaidTx {
  transactionId: string;
  accountId: string;
  amount: number;
  date: string;
  name: string;
  merchantName: string | null;
  pending: boolean;
}
