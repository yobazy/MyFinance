# MyFinance TS Worker

This worker polls `processing_jobs` in Supabase and executes async jobs (starting with `ingest_upload` for Amex `.xlsx`).

## Setup

1) Ensure you ran these Supabase migrations:
- `supabase/migrations/002_queue_rpc.sql`
- `supabase/migrations/003_transactions_metadata_and_dedupe.sql`
- `supabase/migrations/004_storage_policies.sql`

2) Create a private Storage bucket named **`uploads`** in Supabase.

3) Create `worker/.env`:

```bash
SUPABASE_URL="https://YOURPROJECT.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
WORKER_ID="worker-local-1"
POLL_INTERVAL_MS=1000
```

## Run locally

```bash
cd worker
npm install
npm run dev
```

## Enqueue a job (shape)

Insert a `processing_jobs` row:
- `type`: `ingest_upload`
- `payload`: `{ "upload_id": "<uuid>" }`

