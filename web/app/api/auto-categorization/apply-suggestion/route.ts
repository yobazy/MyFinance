import { createSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
export const maxDuration = 30;

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

  const body = (await req.json()) as {
    transaction_id?: string;
    category_id?: string;
    description_snapshot?: string;
  };

  const transactionId = body.transaction_id?.trim();
  const categoryId = body.category_id?.trim();
  const descriptionSnapshot = body.description_snapshot?.trim();

  if (!transactionId) return json(400, { error: 'Missing transaction_id' });
  if (!categoryId) return json(400, { error: 'Missing category_id' });
  if (!descriptionSnapshot) return json(400, { error: 'Missing description_snapshot' });

  // Verify transaction belongs to user and get current state
  const { data: tx, error: txErr } = await supabase
    .from('transactions')
    .select('id,user_id,category_id,suggested_category_id,description')
    .eq('id', transactionId)
    .eq('user_id', userId)
    .single();

  if (txErr || !tx) return json(404, { error: 'Transaction not found' });

  const fromCategoryId = tx.category_id;

  // Update transaction
  const { error: updErr } = await supabase
    .from('transactions')
    .update({
      category_id: categoryId,
      auto_categorized: true,
      suggested_category_id: null,
      confidence_score: null,
    })
    .eq('id', transactionId)
    .eq('user_id', userId);

  if (updErr) return json(500, { error: updErr.message });

  // Log feedback
  const { error: feedbackErr } = await supabase.from('categorization_feedback').insert({
    user_id: userId,
    transaction_id: transactionId,
    from_category_id: fromCategoryId,
    to_category_id: categoryId,
    source: 'suggestion_apply',
    description_snapshot: descriptionSnapshot,
  });

  if (feedbackErr) {
    // Log error but don't fail the request
    console.error('Failed to log categorization feedback:', feedbackErr);
  }

  return json(200, { ok: true });
}
