import type { Transaction } from 'plaid';
import { fingerprintTransaction } from '../fingerprint';
import type { NormalizedTransactionInsert } from './amex';

type NormalizePlaidTransactionsParams = {
  userId: string;
  accountId: string;
  plaidAccountId: string;
  source?: string;
  transactions: Transaction[];
};

function toIsoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const s = value.trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;

  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function normalizePlaidTransactions(
  params: NormalizePlaidTransactionsParams
): NormalizedTransactionInsert[] {
  const source = params.source ?? 'Plaid';
  const out: NormalizedTransactionInsert[] = [];

  for (const tx of params.transactions) {
    // Keep first pass simple: import posted rows and ignore pending rows.
    if (tx.pending) continue;

    const date = toIsoDate(tx.date) ?? toIsoDate(tx.authorized_date) ?? null;
    const description = String(tx.name ?? tx.merchant_name ?? '').trim();
    const amount = Number(tx.amount);
    const merchant = tx.merchant_name?.trim() || null;

    if (!date || !description || !Number.isFinite(amount)) continue;

    const descriptionUpper = description.toUpperCase();
    const fingerprintSource = tx.transaction_id
      ? `${source}:${tx.transaction_id}`
      : `${source}:${params.plaidAccountId}`;

    const fingerprint = fingerprintTransaction({
      userId: params.userId,
      accountId: params.accountId,
      source: fingerprintSource,
      date,
      amount: String(amount),
      description: descriptionUpper,
    });

    out.push({
      user_id: params.userId,
      account_id: params.accountId,
      date,
      description: descriptionUpper,
      amount,
      source,
      merchant,
      raw: tx as unknown as Record<string, unknown>,
      fingerprint,
    });
  }

  return out;
}

