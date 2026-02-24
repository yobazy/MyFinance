import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
} from 'plaid';

function getPlaidEnv(): string {
  const raw = (process.env.PLAID_ENV ?? 'sandbox').trim().toLowerCase();

  if (raw === 'sandbox') return PlaidEnvironments.sandbox;
  if (raw === 'development') return PlaidEnvironments.development;
  if (raw === 'production') return PlaidEnvironments.production;

  throw new Error(
    'Invalid PLAID_ENV. Expected one of: sandbox, development, production.'
  );
}

export function createPlaidClient() {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;

  if (!clientId) throw new Error('Missing PLAID_CLIENT_ID');
  if (!secret) throw new Error('Missing PLAID_SECRET');

  const config = new Configuration({
    basePath: getPlaidEnv(),
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': clientId,
        'PLAID-SECRET': secret,
      },
    },
  });

  return new PlaidApi(config);
}

