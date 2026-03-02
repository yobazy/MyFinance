-- MyFinance: capture user feedback on categorizations
-- Run after 001_init.sql
--
-- Stores when a user applies a suggestion or overrides a category so that
-- future predictive models can learn from corrections.

create table if not exists public.categorization_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  from_category_id uuid null references public.categories(id) on delete set null,
  to_category_id uuid not null references public.categories(id) on delete set null,
  source text not null, -- suggestion_apply | auto_override | manual
  description_snapshot text not null,
  created_at timestamptz not null default now()
);

create index if not exists categorization_feedback_user_tx_idx
  on public.categorization_feedback(user_id, transaction_id);

alter table public.categorization_feedback enable row level security;

do $$
begin
  execute 'create policy "categorization_feedback_select_own" on public.categorization_feedback for select using (user_id = auth.uid())';
  execute 'create policy "categorization_feedback_insert_own" on public.categorization_feedback for insert with check (user_id = auth.uid())';
  execute 'create policy "categorization_feedback_update_own" on public.categorization_feedback for update using (user_id = auth.uid()) with check (user_id = auth.uid())';
  execute 'create policy "categorization_feedback_delete_own" on public.categorization_feedback for delete using (user_id = auth.uid())';
exception
  when duplicate_object then
    null;
end $$;

