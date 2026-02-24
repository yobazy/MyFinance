import { createHash } from 'node:crypto';

export function fingerprintTransaction(input: {
  userId: string;
  accountId: string;
  source: string;
  date: string; // YYYY-MM-DD
  amount: string; // canonical string
  description: string;
}): string {
  const canonical = [
    input.userId,
    input.accountId,
    input.source.trim(),
    input.date.trim(),
    input.amount.trim(),
    input.description.trim().toUpperCase(),
  ].join('|');

  return createHash('sha256').update(canonical).digest('hex');
}

