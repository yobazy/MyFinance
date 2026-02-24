-- MyFinance: initial Supabase schema (core tables + RLS)
-- Run this in Supabase SQL editor (or via Supabase CLI migrations).

-- Extensions
create extension if not exists pgcrypto;

-- Utility: updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Accounts
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  bank text not null,
  name text not null,
  type text not null default 'checking',
  balance numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_user_bank_name_unique unique (user_id, bank, name)
);

create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

-- Categories (hierarchical)
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  parent_id uuid null references public.categories(id) on delete cascade,
  description text not null default '',
  color text not null default '#2196F3',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_user_parent_name_unique unique (user_id, parent_id, name)
);

create index if not exists categories_user_parent_idx on public.categories(user_id, parent_id);

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

-- Transactions
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  date date not null,
  description text not null,
  amount numeric not null,
  source text not null,
  category_id uuid null references public.categories(id) on delete set null,
  auto_categorized boolean not null default false,
  confidence_score double precision null,
  suggested_category_id uuid null references public.categories(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx on public.transactions(user_id, date desc);
create index if not exists transactions_user_account_date_idx on public.transactions(user_id, account_id, date desc);
create index if not exists transactions_user_category_date_idx on public.transactions(user_id, category_id, date desc);

create trigger transactions_set_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

-- Categorization rules
create table if not exists public.categorization_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  rule_type text not null,
  pattern text not null,
  conditions jsonb not null default '{}'::jsonb,
  category_id uuid not null references public.categories(id) on delete cascade,
  priority int not null default 1,
  is_active boolean not null default true,
  case_sensitive boolean not null default false,
  match_count int not null default 0,
  last_matched timestamptz null,
  created_by text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists categorization_rules_user_priority_idx on public.categorization_rules(user_id, priority desc);

create trigger categorization_rules_set_updated_at
before update on public.categorization_rules
for each row execute function public.set_updated_at();

-- Rule usage (denormalize user_id for simple RLS)
create table if not exists public.rule_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  rule_id uuid not null references public.categorization_rules(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  matched_at timestamptz not null default now(),
  confidence_score double precision not null default 1.0,
  was_applied boolean not null default true
);

create index if not exists rule_usage_user_matched_at_idx on public.rule_usage(user_id, matched_at desc);

-- Uploads (file metadata)
create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  bank text not null,
  file_type text not null, -- TD / Amex / Scotiabank / ...
  storage_path text not null,
  original_filename text not null,
  status text not null default 'uploaded', -- uploaded | processing | succeeded | failed
  error text null,
  rows_processed int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists uploads_user_created_at_idx on public.uploads(user_id, created_at desc);

create trigger uploads_set_updated_at
before update on public.uploads
for each row execute function public.set_updated_at();

-- Processing jobs (simple queue)
create table if not exists public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null, -- ingest_upload, recompute_rollups, apply_rules, ...
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued', -- queued | running | succeeded | failed
  attempts int not null default 0,
  max_attempts int not null default 5,
  locked_at timestamptz null,
  locked_by text null,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists processing_jobs_status_created_at_idx on public.processing_jobs(status, created_at);

create trigger processing_jobs_set_updated_at
before update on public.processing_jobs
for each row execute function public.set_updated_at();

-- =========================
-- RLS
-- =========================
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.categorization_rules enable row level security;
alter table public.rule_usage enable row level security;
alter table public.uploads enable row level security;
alter table public.processing_jobs enable row level security;

-- Helper: standard per-user RLS policies
do $$
begin
  -- accounts
  execute 'create policy "accounts_select_own" on public.accounts for select using (user_id = auth.uid())';
  execute 'create policy "accounts_insert_own" on public.accounts for insert with check (user_id = auth.uid())';
  execute 'create policy "accounts_update_own" on public.accounts for update using (user_id = auth.uid()) with check (user_id = auth.uid())';
  execute 'create policy "accounts_delete_own" on public.accounts for delete using (user_id = auth.uid())';

  -- categories
  execute 'create policy "categories_select_own" on public.categories for select using (user_id = auth.uid())';
  execute 'create policy "categories_insert_own" on public.categories for insert with check (user_id = auth.uid())';
  execute 'create policy "categories_update_own" on public.categories for update using (user_id = auth.uid()) with check (user_id = auth.uid())';
  execute 'create policy "categories_delete_own" on public.categories for delete using (user_id = auth.uid())';

  -- transactions
  execute 'create policy "transactions_select_own" on public.transactions for select using (user_id = auth.uid())';
  execute 'create policy "transactions_insert_own" on public.transactions for insert with check (user_id = auth.uid())';
  execute 'create policy "transactions_update_own" on public.transactions for update using (user_id = auth.uid()) with check (user_id = auth.uid())';
  execute 'create policy "transactions_delete_own" on public.transactions for delete using (user_id = auth.uid())';

  -- categorization_rules
  execute 'create policy "categorization_rules_select_own" on public.categorization_rules for select using (user_id = auth.uid())';
  execute 'create policy "categorization_rules_insert_own" on public.categorization_rules for insert with check (user_id = auth.uid())';
  execute 'create policy "categorization_rules_update_own" on public.categorization_rules for update using (user_id = auth.uid()) with check (user_id = auth.uid())';
  execute 'create policy "categorization_rules_delete_own" on public.categorization_rules for delete using (user_id = auth.uid())';

  -- rule_usage
  execute 'create policy "rule_usage_select_own" on public.rule_usage for select using (user_id = auth.uid())';
  execute 'create policy "rule_usage_insert_own" on public.rule_usage for insert with check (user_id = auth.uid())';
  execute 'create policy "rule_usage_update_own" on public.rule_usage for update using (user_id = auth.uid()) with check (user_id = auth.uid())';
  execute 'create policy "rule_usage_delete_own" on public.rule_usage for delete using (user_id = auth.uid())';

  -- uploads
  execute 'create policy "uploads_select_own" on public.uploads for select using (user_id = auth.uid())';
  execute 'create policy "uploads_insert_own" on public.uploads for insert with check (user_id = auth.uid())';
  execute 'create policy "uploads_update_own" on public.uploads for update using (user_id = auth.uid()) with check (user_id = auth.uid())';
  execute 'create policy "uploads_delete_own" on public.uploads for delete using (user_id = auth.uid())';

  -- processing_jobs
  execute 'create policy "processing_jobs_select_own" on public.processing_jobs for select using (user_id = auth.uid())';
  execute 'create policy "processing_jobs_insert_own" on public.processing_jobs for insert with check (user_id = auth.uid())';
  execute 'create policy "processing_jobs_update_own" on public.processing_jobs for update using (user_id = auth.uid()) with check (user_id = auth.uid())';
  execute 'create policy "processing_jobs_delete_own" on public.processing_jobs for delete using (user_id = auth.uid())';
exception
  when duplicate_object then
    -- Allows rerunning the migration in dev without failing on existing policies.
    null;
end $$;

