import { createSupabaseAdminClient } from '../../../../lib/supabaseAdmin';
import { createPlaidClient } from '../../../../lib/plaid';
import { normalizePlaidTransactions } from '../../../../lib/parsers/plaid';
import type { Transaction } from 'plaid';

export const runtime = 'nodejs';

const PLAID_PAGE_SIZE = 500;

type ImportRequest = {
  publicToken?: unknown;
  accountId?: unknown;
  plaidAccountId?: unknown;
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function toIsoDate(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export async function POST(req: Request) {
  const authz = req.headers.get('authorization') ?? '';
  const token = authz.toLowerCase().startsWith('bearer ')
    ? authz.slice('bearer '.length).trim()
    : '';

  if (!token) return json(401, { error: 'Missing Bearer token' });

  const body = (await req.json().catch(() => ({}))) as ImportRequest;
  const publicToken = String(body.publicToken ?? '').trim();
  const accountId = String(body.accountId ?? '').trim();
  const plaidAccountId = String(body.plaidAccountId ?? '').trim();

  if (!publicToken) return json(400, { error: 'Missing publicToken' });
  if (!accountId) return json(400, { error: 'Missing accountId' });

  const supabase = createSupabaseAdminClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr) return json(401, { error: userErr.message });

  const userId = userData.user?.id;
  if (!userId) return json(401, { error: 'Invalid token' });

  const { data: acct, error: acctErr } = await supabase
    .from('accounts')
    .select('id,bank')
    .eq('id', accountId)
    .eq('user_id', userId)
    .single();

  if (acctErr) return json(403, { error: 'Account not found for user' });

  try {
    const plaid = createPlaidClient();
    const exchangeResp = await plaid.itemPublicTokenExchange({
      public_token: publicToken,
    });
    const accessToken = exchangeResp.data.access_token;

    const accountsResp = await plaid.accountsGet({ access_token: accessToken });
    const linkedAccountIds = accountsResp.data.accounts.map((a) => a.account_id);
    let selectedPlaidAccountId = plaidAccountId;

    if (!selectedPlaidAccountId) {
      if (linkedAccountIds.length !== 1) {
        return json(400, {
          error:
            'You linked multiple Plaid accounts. Please select one account to import.',
        });
      }
      selectedPlaidAccountId = linkedAccountIds[0];
    }

    if (!linkedAccountIds.includes(selectedPlaidAccountId)) {
      return json(400, { error: 'Selected Plaid account was not linked.' });
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() - 365);

    const allTransactions: Transaction[] = [];
    let offset = 0;
    let total = 0;

    do {
      const txResp = await plaid.transactionsGet({
        access_token: accessToken,
        start_date: toIsoDate(startDate),
        end_date: toIsoDate(endDate),
        options: {
          account_ids: [selectedPlaidAccountId],
          count: PLAID_PAGE_SIZE,
          offset,
        },
      });

      allTransactions.push(...txResp.data.transactions);
      total = txResp.data.total_transactions;
      offset += txResp.data.transactions.length;
    } while (offset < total);

    const transactions = normalizePlaidTransactions({
      userId,
      accountId,
      plaidAccountId: selectedPlaidAccountId,
      source: 'Plaid',
      transactions: allTransactions,
    });

    if (transactions.length > 0) {
      const { error: upsertErr } = await supabase
        .from('transactions')
        .upsert(transactions, { onConflict: 'user_id,account_id,fingerprint' });

      if (upsertErr) return json(500, { error: upsertErr.message });
    }

    return json(200, {
      ok: true,
      rowsProcessed: transactions.length,
      account: acct,
      plaidAccountId: selectedPlaidAccountId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(500, { error: msg });
  }
}

