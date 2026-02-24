export type NormalizedTransaction = {
  user_id: string;
  account_id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  source: string;
  merchant?: string | null;
  raw: Record<string, unknown>;
  fingerprint: string;
};

