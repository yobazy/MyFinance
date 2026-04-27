-- Stores AI-generated spending narrative summaries
create table if not exists public.spending_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  narrative text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.spending_insights enable row level security;

create policy "Users can read own insights"
  on public.spending_insights for select
  using (auth.uid() = user_id);

create policy "Service role can manage insights"
  on public.spending_insights for all
  using (true)
  with check (true);

create index spending_insights_user_created_idx
  on public.spending_insights(user_id, created_at desc);
