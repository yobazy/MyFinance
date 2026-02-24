-- MyFinance: transactions metadata + idempotent dedupe support
-- Run after 001_init.sql

alter table public.transactions
  add column if not exists merchant text null,
  add column if not exists raw jsonb not null default '{}'::jsonb,
  add column if not exists fingerprint text null;

-- Idempotency: allow worker to upsert by (user_id, account_id, fingerprint).
-- Partial unique index so existing/manual rows without fingerprint are allowed.
create unique index if not exists transactions_user_account_fingerprint_unique
  on public.transactions(user_id, account_id, fingerprint)
  where fingerprint is not null;

