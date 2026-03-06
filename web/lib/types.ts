export type Account = {
  id: string;
  bank: string;
  name: string;
  type: string;
  balance: number;
  created_at: string;
  updated_at: string;
};

export type Upload = {
  id: string;
  account_id: string;
  bank: string;
  file_type: string;
  storage_path: string;
  original_filename: string;
  status: string;
  error: string | null;
  rows_processed: number;
  rows_reversed?: number;
  reversed_at?: string | null;
  created_at: string;
  updated_at: string;
};

