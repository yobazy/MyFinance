# Supabase + Next.js Migration Plan (Async Ingestion)

Goal: move from **Django + CRA + SQLite** to a multi-user architecture centered on **TypeScript/Node + Supabase (Postgres/Auth/Storage)**, with **async processing** for statement ingestion and analytics rollups.

This repo today (Django) already models data per-user:
- `Account.user`
- `Category.user`
- `Transaction.user`
- `CategorizationRule.user`
- `RuleUsage` joins rule + transaction

That maps directly to Supabase tables with **Row Level Security (RLS)**.

---

## Recommended target architecture

### Web/API (TypeScript)
- **Next.js** app (single codebase for UI + server-side API routes / server actions)
- **supabase-js** for Auth + Storage + DB access
- For privileged operations (e.g., bulk upserts, admin tasks), use **server-side** code with the **service role key** (never ship it to browsers)

### Async processing (worker)
Two good options:

1) **TS worker (preferred if you want one language)**  
Use Postgres-backed job queue via:
- `graphile-worker` (Postgres-native), or
- `pg-boss` (Postgres-native)

2) **Python worker (pragmatic because your parsing logic is already pandas-heavy)**  
Keep Python only for ingestion/analytics transforms. It reads jobs from Postgres and writes results back.

You can start with (2) for speed, then port to (1) later if desired.

### Storage
- Supabase Storage bucket, e.g. `uploads`
- Upload path convention: `user_id/<upload_id>/<original_filename>`
- Worker uses a **signed URL** (or service key) to download the file for processing

---

## Core data model (Supabase)

Use UUIDs everywhere. Add `user_id uuid not null` on all user-owned tables.

### `accounts`
- `id uuid pk`
- `user_id uuid fk -> auth.users.id`
- `bank text`
- `name text`
- `type text` (checking/savings/credit)
- `balance numeric` (optional; can be computed / cached)
- Unique: `(user_id, bank, name)`

### `categories`
- `id uuid pk`
- `user_id uuid`
- `name text`
- `parent_id uuid null -> categories.id`
- `color text`, `is_active bool`, timestamps
- Unique: `(user_id, parent_id, name)` (same logic as Django)

### `transactions`
- `id uuid pk`
- `user_id uuid`
- `account_id uuid`
- `date date`
- `description text`
- `amount numeric`
- `source text` (TD/Amex/Scotiabank/…)
- `category_id uuid null`
- `auto_categorized bool`, `confidence_score float`, `suggested_category_id uuid null`
- Suggested indexes:
  - `(user_id, date desc)`
  - `(user_id, account_id, date desc)`
  - `(user_id, category_id, date desc)`

### `categorization_rules`
- `id uuid pk`
- `user_id uuid`
- `name text`
- `rule_type text`
- `pattern text`
- `conditions jsonb`
- `category_id uuid`
- `priority int`
- `is_active bool`
- `match_count int`, `last_matched timestamptz`

### `rule_usage`
- `id uuid pk`
- `user_id uuid` (denormalize for RLS simplicity)
- `rule_id uuid`
- `transaction_id uuid`
- `matched_at timestamptz`
- `confidence_score float`
- `was_applied bool`

### Upload/job tables (new)

#### `uploads`
Represents an uploaded statement file (metadata).
- `id uuid pk`
- `user_id uuid`
- `account_id uuid`
- `bank text`
- `file_type text` (TD/Amex/Scotiabank)
- `storage_path text`
- `original_filename text`
- `status text` (uploaded/processing/succeeded/failed)
- `error text null`
- timestamps

#### `processing_jobs`
Queue table (or use graphile-worker/pg-boss tables).
- `id uuid pk`
- `user_id uuid`
- `type text` (ingest_upload, recompute_rollups, apply_rules, ...)
- `payload jsonb`
- `status text` (queued/running/succeeded/failed)
- `attempts int`, `max_attempts int`
- `locked_at timestamptz`, `locked_by text`
- timestamps

---

## RLS policies (high level)

Enable RLS on every user-owned table and enforce:
- Read: `user_id = auth.uid()`
- Write: `user_id = auth.uid()`

For server-only operations (bulk upserts, worker writes), use the **service role** key on the server/worker so you’re not fighting policy limitations.

---

## Async ingestion flow (end-to-end)

1) **Client** uploads file to Supabase Storage (authenticated user).
2) **Client** inserts an `uploads` row (status = `uploaded`) and a `processing_jobs` row (type = `ingest_upload`).
3) **Worker** picks job, marks `running`, downloads file, parses, normalizes:
   - canonicalize description (you currently uppercase)
   - dedupe (important for multi-upload)
   - map to `transactions` rows + optional raw tables if you still want them
4) **Worker** bulk inserts/updates transactions (idempotent strategy recommended).
5) **Worker** updates derived/cached tables (balances, rollups/materialized views) and marks job + upload as `succeeded`.
6) **UI** polls job status or subscribes via Supabase Realtime on `processing_jobs`.

---

## Analytics: prefer SQL first, worker second

Most of your current `get_visualization_data` can move to SQL queries/views:
- category spending = `group by category_id`
- monthly trend = `date_trunc('month', date)`
- top merchants = `group by description`

Then decide:
- **On-demand queries** (simple, fine early on)
- **Rollup tables/materialized views** refreshed by the worker after ingestion (better at scale)

---

## Migration strategy (phased, low-risk)

### Phase 1 — Stand up Supabase schema + Auth, keep current frontend
- Create tables + RLS.
- Add a minimal Node API (or Next.js) that writes/reads Supabase.
- Keep Django running while you validate Supabase parity.

### Phase 2 — Next.js app becomes the primary UI/API
- Move auth to Supabase Auth.
- Re-implement endpoints used by the UI (accounts, categories, transactions, visualizations).
- Swap CRA build for Next.js pages/components incrementally (or keep CRA briefly and just repoint API).

### Phase 3 — Async ingestion worker
- Introduce `uploads` + jobs + worker.
- Replace Django’s `/api/upload*` with “upload to Storage + enqueue job”.
- Implement idempotency + dedupe.

### Phase 4 — Decommission Django
- Once uploads + rules + analytics parity are reached, remove Django backend.

---

## Notes about features that change under Supabase

- **Database backups**: Supabase handles platform backups. Your in-app “backup/restore” becomes more like “export/import user data” (optional) rather than DB file operations.
- **OAuth**: Supabase Auth can replace your Django allauth + JWT setup.

