# MyFinance Dashboard

Personal finance dashboard for uploading bank statements, categorizing transactions, and visualizing spending patterns.

**Stack**: Next.js 15 · React 19 · TypeScript · Supabase (Postgres + Auth) · Material-UI 6 · TypeScript worker

> The legacy Django + Create React App stack is archived in `legacy/` for reference only. All active development is in `web/` and `worker/`.

---

## Features

- **Statement uploads** — Amex XLSX statements parsed and deduplicated on import
- **Plaid integration** — Connect bank accounts and import transactions directly
- **Auto-categorization** — Rule-based categorization with a feedback loop and suggestion review
- **Undo uploads** — Roll back any upload and its associated transactions
- **Visualizations** — Spending by category, monthly trends, and account balance tracking
- **Multi-user** — Full per-user data isolation via Supabase RLS
- **Auth** — Email/password, Google OAuth, and GitHub OAuth

---

## Repo Structure

```
web/          # Next.js 15 frontend + API routes
worker/       # TypeScript polling worker (parses uploads, applies rules)
supabase/     # 11 SQL migrations
docs/         # Architecture docs & migration notes
legacy/       # Archived Django + CRA stack (do not modify)
```

---

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- Plaid API credentials (optional — only needed for bank connection)

---

## Setup

### 1. Database

Apply migrations to your Supabase project via the CLI or the dashboard SQL editor:

```bash
supabase db push
```

Migrations are in `supabase/migrations/` (001 through 011).

### 2. Frontend (`web/`)

```bash
cd web
cp env.example .env.local   # fill in your Supabase + Plaid credentials
npm install
npm run dev                  # http://localhost:3000
```

**Required env vars** (`web/.env.local`):

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `PLAID_CLIENT_ID` | Plaid client ID (optional) |
| `PLAID_SECRET` | Plaid secret (optional) |
| `PLAID_ENV` | `sandbox` \| `development` \| `production` |

### 3. Worker (`worker/`)

The worker polls Supabase for pending jobs (statement parsing, rule application) and processes them asynchronously.

```bash
cd worker
cp .env.example .env        # fill in Supabase credentials
npm install
npm run dev                  # tsx watch mode
```

**Required env vars** (`worker/.env`):

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `WORKER_ID` | Unique worker identifier (e.g. `worker-local-1`) |
| `POLL_INTERVAL_MS` | Polling interval in ms (e.g. `1000`) |

### 4. Auth

In your Supabase project's Auth settings:
- Enable **Email** provider for email/password sign-in
- Set **Site URL** to `http://localhost:3000` for local development
- Optionally enable Google and GitHub OAuth providers

---

## Dev Commands

```bash
# From repo root
npm run web:dev        # Next.js frontend (port 3000)
npm run worker:dev     # TypeScript worker (auto-reload)

# From web/
npm run build          # Production build
npm run lint
npm run test:e2e       # Playwright E2E tests
npm run test:e2e:ui    # Playwright UI mode

# From worker/
npm run build          # tsc → dist/
npm run start          # Run compiled worker
```

---

## Key API Routes

| Route | Purpose |
|---|---|
| `POST /api/ingest/amex` | Upload & parse Amex XLSX statement |
| `POST /api/plaid/link-token` | Generate Plaid Link token |
| `POST /api/plaid/import` | Import transactions from Plaid |
| `POST /api/auto-categorization/apply` | Bulk apply categorization rules |
| `POST /api/auto-categorization/apply-suggestion` | Accept a single suggestion |
| `POST /api/uploads/[uploadId]/undo` | Undo an upload |
