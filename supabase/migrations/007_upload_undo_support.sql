-- MyFinance: upload undo support
-- Run after 001-006 migrations.

alter table public.transactions
  add column if not exists upload_id uuid null references public.uploads(id) on delete set null;

create index if not exists transactions_upload_id_idx
  on public.transactions(upload_id);

create index if not exists transactions_user_upload_id_idx
  on public.transactions(user_id, upload_id);

alter table public.uploads
  add column if not exists reversed_at timestamptz null,
  add column if not exists rows_reversed int not null default 0;

