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
  const suggestedCategoryId = tx.suggested_category_id;

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

  // Log feedback - track if user accepted the suggestion or changed it
  const source = suggestedCategoryId === categoryId ? 'suggestion_apply' : 'suggestion_override';
  
  const { error: feedbackErr } = await supabase.from('categorization_feedback').insert({
    user_id: userId,
    transaction_id: transactionId,
    from_category_id: fromCategoryId,
    to_category_id: categoryId,
    source,
    description_snapshot: descriptionSnapshot,
  });

  // If user accepted a suggestion, update rule_usage to mark it as accepted
  if (suggestedCategoryId === categoryId) {
    // Find the rule_usage record for this suggestion
    const { data: ruleUsage, error: ruleUsageErr } = await supabase
      .from('rule_usage')
      .select('id, rule_id')
      .eq('user_id', userId)
      .eq('transaction_id', transactionId)
      .eq('was_applied', false)
      .order('matched_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!ruleUsageErr && ruleUsage) {
      // Update the rule's match_count (function may not exist in all environments)
      try {
        const { error: rpcErr } = await supabase.rpc('increment_rule_match_count', {
          rule_id: ruleUsage.rule_id,
        });
        if (rpcErr) throw rpcErr;
      } catch (rpcErr) {
        // If function doesn't exist, get current count and increment manually (fallback)
        const { data: rule } = await supabase
          .from('categorization_rules')
          .select('match_count')
          .eq('id', ruleUsage.rule_id)
          .single();

        if (rule) {
          await supabase
            .from('categorization_rules')
            .update({
              match_count: (rule.match_count || 0) + 1,
              last_matched: new Date().toISOString(),
            })
            .eq('id', ruleUsage.rule_id);
        }
      }
    }
  }

  if (feedbackErr) {
    // Log error but don't fail the request
    console.error('Failed to log categorization feedback:', feedbackErr);
  }

  return json(200, { ok: true });
}
