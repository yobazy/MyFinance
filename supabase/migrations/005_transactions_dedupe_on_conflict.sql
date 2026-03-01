-- MyFinance: fix transactions upsert conflict target
--
-- Supabase JS `.upsert(..., { onConflict: 'user_id,account_id,fingerprint' })`
-- requires a UNIQUE constraint / UNIQUE index that matches the conflict target.
--
-- Our previous migration (003) created a PARTIAL unique index:
--   (user_id, account_id, fingerprint) WHERE fingerprint IS NOT NULL
-- PostgREST/Supabase upsert does not provide a way to specify the predicate,
-- so Postgres cannot match it and throws:
--   "there is no unique or exclusion constraint matching the ON CONFLICT specification"
--
-- Solution: replace the partial unique index with a full unique index.
-- Note: Postgres UNIQUE indexes allow multiple NULLs, so nullable fingerprints
-- for manual rows are still permitted.

drop index if exists public.transactions_user_account_fingerprint_unique;

create unique index if not exists transactions_user_account_fingerprint_unique
  on public.transactions(user_id, account_id, fingerprint);

