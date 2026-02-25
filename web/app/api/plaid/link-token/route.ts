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

