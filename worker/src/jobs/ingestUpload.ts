import type { SupabaseClient } from '@supabase/supabase-js';
import { parseAmexXlsx } from '../parsers/amex.js';
import type { NormalizedTransaction } from '../parsers/types.js';

type JobRow = {
  id: string;
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
};

type UploadRow = {
  id: string;
  user_id: string;
  account_id: string;
  bank: string;
  file_type: string;
  storage_path: string;
  original_filename: string;
  status: string;
};

async function downloadUploadFile(params: {
  supabase: SupabaseClient;
  storagePath: string;
}): Promise<Buffer> {
  const { data, error } = await params.supabase.storage
    .from('uploads')
    .download(params.storagePath);

  if (error) throw error;
  if (!data) throw new Error('Storage download returned no data');

  const arrBuf = await data.arrayBuffer();
  return Buffer.from(arrBuf);
}

export async function handleIngestUploadJob(params: {
  supabase: SupabaseClient;
  job: JobRow;
}): Promise<{ rowsProcessed: number }> {
  const uploadId = String(params.job.payload.upload_id ?? '');
  if (!uploadId) throw new Error('Job payload missing upload_id');

  const { data: upload, error: uploadErr } = await params.supabase
    .from('uploads')
    .select(
      'id,user_id,account_id,bank,file_type,storage_path,original_filename,status'
    )
    .eq('id', uploadId)
    .single<UploadRow>();

  if (uploadErr) throw uploadErr;

  // Mark upload as processing
  await params.supabase
    .from('uploads')
    .update({ status: 'processing', error: null })
    .eq('id', upload.id);

  const fileBuf = await downloadUploadFile({
    supabase: params.supabase,
    storagePath: upload.storage_path,
  });

  let transactions: NormalizedTransaction[] = [];

  if (upload.file_type.toLowerCase() === 'amex') {
    transactions = await parseAmexXlsx({
      buffer: fileBuf,
      userId: upload.user_id,
      accountId: upload.account_id,
      source: 'Amex',
    });
  } else {
    throw new Error(`Unsupported file_type: ${upload.file_type}`);
  }

  if (transactions.length > 0) {
    // Upsert for idempotency using partial unique index on (user_id, account_id, fingerprint)
    const { error: upsertErr } = await params.supabase
      .from('transactions')
      .upsert(transactions, { onConflict: 'user_id,account_id,fingerprint' });

    if (upsertErr) throw upsertErr;
  }

  await params.supabase
    .from('uploads')
    .update({ status: 'succeeded', rows_processed: transactions.length })
    .eq('id', upload.id);

  return { rowsProcessed: transactions.length };
}

