import { createSupabaseAdminClient } from '../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function GET(req: Request) {
  const supabase = createSupabaseAdminClient();

  const authz = req.headers.get('authorization') ?? '';
  const token = authz.toLowerCase().startsWith('bearer ') ? authz.slice(7).trim() : '';
  if (!token) return json(401, { error: 'Missing Bearer token' });

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr) return json(401, { error: userErr.message });
  const userId = userData.user?.id;
  if (!userId) return json(401, { error: 'Invalid token' });

  const { data, error } = await supabase
    .from('spending_insights')
    .select('id,period_start,period_end,narrative,metadata,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(6);

  if (error) return json(500, { error: error.message });

  return json(200, { insights: data ?? [] });
}
