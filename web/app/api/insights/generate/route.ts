import { createSupabaseAdminClient } from '../../../../lib/supabaseAdmin';
import { getUserAnthropicKey } from '../../../../lib/getUserAnthropicKey';

export const runtime = 'nodejs';

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function POST(req: Request) {
  const supabase = createSupabaseAdminClient();

  const authz = req.headers.get('authorization') ?? '';
  const token = authz.toLowerCase().startsWith('bearer ') ? authz.slice(7).trim() : '';
  if (!token) return json(401, { error: 'Missing Bearer token' });

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr) return json(401, { error: userErr.message });
  const userId = userData.user?.id;
  if (!userId) return json(401, { error: 'Invalid token' });

  const hasKey = !!(await getUserAnthropicKey(userId));
  if (!hasKey) {
    return json(402, { error: 'No Anthropic API key saved. Add one in Settings.' });
  }

  const { error } = await supabase.from('processing_jobs').insert({
    user_id: userId,
    type: 'generate_insights',
    payload: {},
    status: 'pending',
  });

  if (error) return json(500, { error: error.message });

  return json(202, { ok: true, message: 'Insight generation queued' });
}
