# MyFinance Web (Next.js + Supabase)

## Setup

1) Create `web/.env.local` from `web/env.example`:

```bash
cd web
cp env.example .env.local
```

2) Fill in:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only; used by `/api/ingest/*`)
- `PLAID_CLIENT_ID` (server-side only)
- `PLAID_SECRET` (server-side only)
- `PLAID_ENV` (`sandbox` | `development` | `production`)

## Auth (Supabase)

This app supports **Google**, **GitHub**, and **email/password** sign-in.

In your Supabase project:

- **Enable providers**: Auth → Providers → enable **Email** (and Google/GitHub if desired).
- **Redirect URLs**: Auth → URL Configuration
  - Set **Site URL** to `http://localhost:3000` for local dev
  - Add your production URL when deployed
- **Email confirmations (optional)**: If “Confirm email” is enabled, sign-up will require clicking a confirmation email before the user can sign in.

## Run

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:3000`.

## Flow

- Create an account in `/accounts`
- Upload an Amex `.xlsx` in `/upload`
- The file is processed immediately by a Next.js API route and then discarded

## Plaid MVP Flow

- Go to `/accounts` and choose **Connect with Plaid** on an existing MyFinance account.
- Plaid Link opens and you connect your institution.
- On success, transactions are imported into the selected existing MyFinance account.
- Imports are idempotent via `transactions` upsert conflict key (`user_id,account_id,fingerprint`).

### Local sandbox test

1. Set `PLAID_ENV=sandbox` in `web/.env.local`.
2. Use your Plaid Sandbox credentials for `PLAID_CLIENT_ID` and `PLAID_SECRET`.
3. Start the app with `npm run dev`.
4. In `/accounts`, click **Connect with Plaid**, complete Link with sandbox test credentials, and import.
5. Repeat the same import and verify duplicate rows are not inserted.
