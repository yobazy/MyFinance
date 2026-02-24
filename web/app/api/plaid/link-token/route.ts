import { createSupabaseAdminClient } from '../../../../lib/supabaseAdmin';
import { createPlaidClient } from '../../../../lib/plaid';
import { CountryCode, Products } from 'plaid';

export const runtime = 'nodejs';

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function POST(req: Request) {
  const authz = req.headers.get('authorization') ?? '';
  const token = authz.toLowerCase().startsWith('bearer ')
    ? authz.slice('bearer '.length).trim()
    : '';

  if (!token) return json(401, { error: 'Missing Bearer token' });

  const supabase = createSupabaseAdminClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr) return json(401, { error: userErr.message });

  const userId = userData.user?.id;
  if (!userId) return json(401, { error: 'Invalid token' });

  try {
    const plaid = createPlaidClient();

    const response = await plaid.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'MyFinance',
      products: [Products.Transactions],
      country_codes: [CountryCode.Ca, CountryCode.Us],
      language: 'en',
    });

    return json(200, {
      ok: true,
      linkToken: response.data.link_token,
      expiration: response.data.expiration,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(500, { error: msg });
  }
}

