import { createSupabaseAdminClient } from '../../../../lib/supabaseAdmin';
import { parseAmexXlsx } from '../../../../lib/parsers/amex';

export const runtime = 'nodejs';

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function validateBearerUserJwt(token: string): string | null {
  if (!token) return 'Missing Bearer token';
  if (/\s/.test(token)) {
    return 'Invalid Bearer token: contains whitespace/newlines. Send a Supabase user access token (JWT) from the browser session, not an API key.';
  }
  if (token.startsWith('sb_secret_') || token.startsWith('sb_publishable_')) {
    return 'Invalid Bearer token: looks like a Supabase API key (sb_*), not a user access token (JWT). In the browser, you must send `session.access_token` from Supabase Auth.';
  }
  if (!token.startsWith('eyJ')) {
    return 'Invalid Bearer token: expected a JWT (starts with "eyJ"). Ensure you are logged in via Supabase Auth and you are sending the user session access token.';
  }
  return null;
}

export async function POST(req: Request) {
  const authz = req.headers.get('authorization') ?? '';
  const token = authz.toLowerCase().startsWith('bearer ')
    ? authz.slice('bearer '.length).trim()
    : '';

  const tokenErr = validateBearerUserJwt(token);
  if (tokenErr) return json(401, { error: tokenErr });

  const supabase = createSupabaseAdminClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr) return json(401, { error: userErr.message });
  const userId = userData.user?.id;
  if (!userId) return json(401, { error: 'Invalid token' });

  const form = await req.formData();
  const file = form.get('file');
  const accountId = String(form.get('account_id') ?? '').trim();

  if (!(file instanceof File)) return json(400, { error: 'Missing file' });
  if (!accountId) return json(400, { error: 'Missing account_id' });

  // Enforce tenancy (service role bypasses RLS)
  const { data: acct, error: acctErr } = await supabase
    .from('accounts')
    .select('id,bank')
    .eq('id', accountId)
    .eq('user_id', userId)
    .single();

  if (acctErr) return json(403, { error: 'Account not found for user' });

  const uploadId = crypto.randomUUID();
  const safeFilename = file.name.replace(/[\\/]/g, '_');
  const storagePath = `${userId}/${uploadId}/${safeFilename}`;

  const { error: uploadInsertErr } = await supabase.from('uploads').insert({
    id: uploadId,
    user_id: userId,
    account_id: accountId,
    bank: String(acct.bank ?? 'Unknown'),
    file_type: 'Amex',
    storage_path: storagePath,
    original_filename: file.name,
    status: 'uploaded',
    error: null,
    rows_processed: 0,
  });

  if (uploadInsertErr) return json(500, { error: uploadInsertErr.message });

  const markFailed = async (message: string) => {
    await supabase
      .from('uploads')
      .update({ status: 'failed', error: message })
      .eq('id', uploadId)
      .eq('user_id', userId);
  };

  try {
    const { error: storageErr } = await supabase.storage
      .from('uploads')
      .upload(storagePath, file, { upsert: false, contentType: file.type || undefined });

    if (storageErr) {
      await markFailed(storageErr.message);
      return json(500, { error: storageErr.message });
    }

    await supabase
      .from('uploads')
      .update({ status: 'processing', error: null })
      .eq('id', uploadId)
      .eq('user_id', userId);

    const buf = Buffer.from(await file.arrayBuffer());
    const transactions = await parseAmexXlsx({
      buffer: buf,
      userId,
      accountId,
      source: 'Amex',
    });

    // Defensive: Postgres insert will error if the same conflict target appears
    // multiple times in a single statement.
    const uniqueTransactions = Array.from(
      new Map(transactions.map((t) => [t.fingerprint, t])).values(),
    );

    let insertedRows = 0;
    if (uniqueTransactions.length > 0) {
      const fingerprints = uniqueTransactions.map((t) => t.fingerprint);
      const { data: existingRows, error: existingErr } = await supabase
        .from('transactions')
        .select('fingerprint')
        .eq('user_id', userId)
        .eq('account_id', accountId)
        .in('fingerprint', fingerprints);

      if (existingErr) {
        await markFailed(existingErr.message);
        return json(500, { error: existingErr.message });
      }

      const existingSet = new Set((existingRows ?? []).map((r) => String(r.fingerprint)));
      const toInsert = uniqueTransactions
        .filter((t) => !existingSet.has(t.fingerprint))
        .map((t) => ({ ...t, upload_id: uploadId }));

      if (toInsert.length > 0) {
        const { error: insertErr } = await supabase.from('transactions').insert(toInsert);
        if (insertErr) {
          await markFailed(insertErr.message);
          return json(500, { error: insertErr.message });
        }
      }
      insertedRows = toInsert.length;
    }

    await supabase
      .from('uploads')
      .update({ status: 'succeeded', error: null, rows_processed: insertedRows })
      .eq('id', uploadId)
      .eq('user_id', userId);

    return json(200, {
      ok: true,
      rowsProcessed: insertedRows,
      uploadId,
      account: acct,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await markFailed(msg);
    return json(500, { error: msg });
  }
}

