import { createSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function getUser(req: Request) {
  const supabase = createSupabaseAdminClient();
  const token = (req.headers.get('authorization') ?? '').replace(/^bearer /i, '').trim();
  if (!token) return { supabase, userId: null };
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return { supabase, userId: null };
  return { supabase, userId: data.user.id };
}

// GET — returns whether a key is saved and a masked preview
export async function GET(req: Request) {
  const { supabase, userId } = await getUser(req);
  if (!userId) return json(401, { error: 'Unauthorized' });

  const { data } = await supabase
    .from('user_settings')
    .select('anthropic_api_key')
    .eq('user_id', userId)
    .maybeSingle();

  const key: string | null = data?.anthropic_api_key ?? null;
  return json(200, {
    hasKey: !!key,
    // Show last 4 chars so user knows which key they saved
    maskedKey: key ? `sk-ant-...${key.slice(-4)}` : null,
  });
}

// PUT — saves or clears the key
export async function PUT(req: Request) {
  const { supabase, userId } = await getUser(req);
  if (!userId) return json(401, { error: 'Unauthorized' });

  let body: { apiKey?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : null;

  // Basic validation — Anthropic keys start with "sk-ant-"
  if (apiKey && !apiKey.startsWith('sk-ant-')) {
    return json(400, { error: 'Invalid Anthropic API key format' });
  }

  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, anthropic_api_key: apiKey || null }, { onConflict: 'user_id' });

  if (error) return json(500, { error: error.message });

  return json(200, { ok: true });
}
