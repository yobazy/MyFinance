-- MyFinance: account balance rollup helpers
-- Provides per-account transaction sums so the UI can show a non-zero balance even
-- when `accounts.balance` isn't being refreshed.

create or replace function public.get_account_balance_rollup()
returns table (
  account_id uuid,
  tx_sum numeric,
  tx_count bigint,
  last_tx_date date
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    t.account_id,
    coalesce(sum(t.amount), 0)::numeric as tx_sum,
    count(*)::bigint as tx_count,
    max(t.date) as last_tx_date
  from public.transactions t
  where t.user_id = auth.uid()
  group by t.account_id;
$$;

