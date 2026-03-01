import { createHash } from 'node:crypto';

export function fingerprintTransaction(input: {
  userId: string;
  accountId: string;
  source: string;
  date: string; // YYYY-MM-DD
  amount: string; // canonical string
  description: string;
  /**
   * Optional extra data to disambiguate transactions that otherwise look identical
   * (e.g. same date/amount/description). Keep this deterministic across imports.
   */
  salt?: string;
}): string {
  const canonical = [
    input.userId,
    input.accountId,
    input.source.trim(),
    input.date.trim(),
    input.amount.trim(),
    input.description.trim().toUpperCase(),
    input.salt ? input.salt.trim() : '',
  ].join('|');

  return createHash('sha256').update(canonical).digest('hex');
}

