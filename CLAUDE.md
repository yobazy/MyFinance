# MyFinance Dashboard — CLAUDE.md

## Project Overview

Personal finance dashboard undergoing migration from a legacy Django + Create React App stack to a modern **Next.js 15 + Supabase + TypeScript worker** stack. The legacy stack lives in `legacy/` and is archived; all active development happens in `web/` and `worker/`.

## Active Stack (use this)

- **Frontend**: `web/` — Next.js 15, React 19, TypeScript, Material-UI 6, Supabase Auth
- **Worker**: `worker/` — TypeScript polling worker, processes async jobs from Supabase queue
- **Database**: Supabase (PostgreSQL + Auth + Storage + RLS)
- **E2E Tests**: Playwright (`web/e2e/`)

## Legacy Stack (do not modify)

- `legacy/django-cra/` — Django 5.1 REST API + Create React App UI (SQLite, Pandas, Recharts)
- Kept for reference and historical data only

## Dev Commands

```bash
# From repo root
npm run web:dev        # Start Next.js frontend (port 3000)
npm run worker:dev     # Start TypeScript worker (tsx, auto-reload)

# From web/
npm run dev            # Next.js dev server
npm run build          # Production build
npm run lint           # ESLint
npm run test:e2e       # Playwright E2E tests
npm run test:e2e:ui    # Playwright UI mode
npm run test:e2e:headed

# From worker/
npm run dev            # tsx watch mode
npm run build          # tsc compile to dist/
npm run start          # Run compiled worker
```

## Environment Variables

**`web/.env.local`** (copy from `web/env.example`):
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
PLAID_CLIENT_ID
PLAID_SECRET
PLAID_ENV                   # sandbox | development | production
E2E_EMAIL                   # Playwright test user
E2E_PASSWORD
```

**`worker/.env`**:
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
WORKER_ID                   # e.g. worker-local-1
POLL_INTERVAL_MS            # e.g. 1000
```

## Repository Structure

```
web/
  app/              # Next.js App Router pages & API routes
    api/            # Server-side route handlers
  lib/              # Shared utilities (Supabase clients, parsers, theme, auth)
  e2e/              # Playwright tests
worker/
  src/
    jobs/           # Job handlers: ingestUpload, applyRules
    parsers/        # Bank statement parsers (Amex XLSX)
    supabase.ts     # Supabase service client
    env.ts          # Zod env validation
supabase/
  migrations/       # 11 SQL migrations (schema → deduplication → categorization)
legacy/             # Archived Django + CRA stack
docs/               # Architecture docs & migration plan
```

## Architecture Notes

### Frontend
- **Routing**: Next.js App Router; key pages: `/accounts`, `/transactions`, `/upload`, `/visualizations`, `/review-suggestions`
- **Auth**: Supabase Auth via `AuthContext` in `web/lib/auth-context.tsx`; `AppShell` wraps authenticated views, `PublicLanding` for unauthenticated
- **Theming**: MUI `ThemeModeProvider` with light/dark mode toggle
- **API calls**: Sensitive ops go through Next.js server route handlers in `app/api/`

### Worker (Job Queue)
- Polls Supabase for `processing_jobs` rows with `status = pending`
- Uses an atomic `dequeue` RPC to claim jobs
- Job types: `ingest_upload` (parse bank statements), `apply_rules` (auto-categorize)
- Job lifecycle: `pending → processing → succeeded | failed`

### Database
- Row-Level Security (RLS) enforces per-user data isolation
- Deduplication: upsert on `(user_id, account_id, fingerprint)` — fingerprint is a hash of transaction fields
- Undo support via `uploads` and `uploads_undo` tables
- Auto-categorization via `category_rules` and `categorization_feedback` tables

### Key API Routes
| Route | Purpose |
|---|---|
| `POST /api/ingest/amex` | Upload & parse Amex XLSX statement |
| `POST /api/plaid/link-token` | Generate Plaid Link token |
| `POST /api/plaid/import` | Import transactions from Plaid |
| `POST /api/auto-categorization/apply` | Bulk apply categorization rules |
| `POST /api/auto-categorization/apply-suggestion` | Accept a single suggestion |
| `POST /api/uploads/[uploadId]/undo` | Undo an upload |

## Database Migrations

Migrations live in `supabase/migrations/`. Apply via Supabase CLI (`supabase db push`) or Supabase dashboard SQL editor. 11 migrations total:
- `001` Core schema
- `002` Job queue RPC
- `003` Transaction deduplication fingerprint
- `004–005` Storage & upsert policies
- `006` Account balance rollup
- `007–008` Upload undo support
- `009–010` Category presets + seed data
- `011` Categorization feedback

## Coding Conventions

- TypeScript strict mode throughout; no `any` unless unavoidable
- Zod for runtime validation at boundaries (env vars, API inputs)
- MUI components for all UI; custom styling via `sx` prop or Emotion
- Supabase client usage:
  - Browser client: `web/lib/supabase/client.ts`
  - Server client: `web/lib/supabase/server.ts` (uses service role key for admin ops)
  - Worker client: `worker/src/supabase.ts`
- Do not modify `legacy/` — it is archived

## Key Features

- Upload Amex XLSX bank statements (sync) or connect via Plaid (async)
- Transaction deduplication on upload
- Manual and rule-based auto-categorization with feedback loop
- Undo upload functionality
- Financial visualizations and account balance tracking
- Multi-user SaaS with Supabase Auth (email/password, Google OAuth, GitHub OAuth)
