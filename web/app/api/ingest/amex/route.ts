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

  const buf = Buffer.from(await file.arrayBuffer());

  const transactions = await parseAmexXlsx({
    buffer: buf,
    userId,
    accountId,
    source: 'Amex',
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
  });
}

