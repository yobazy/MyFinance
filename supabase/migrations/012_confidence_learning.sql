-- MyFinance: Enhanced confidence calculation and learning system
-- This migration adds functions and triggers to support dynamic confidence scoring

-- Function to increment rule match_count
create or replace function public.increment_rule_match_count(rule_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.categorization_rules
  set match_count = match_count + 1,
      last_matched = now()
  where id = rule_id;
end;
$$;

-- Function to track manual categorizations for learning
create or replace function public.track_manual_categorization()
returns trigger
language plpgsql
security definer
as $$
declare
  old_category_id uuid;
  new_category_id uuid;
  had_suggestion boolean;
begin
  -- Only track if category actually changed
  if OLD.category_id is distinct from NEW.category_id then
    old_category_id := OLD.category_id;
    new_category_id := NEW.category_id;
    had_suggestion := OLD.suggested_category_id is not null;

    -- If user manually categorized (not from suggestion), log it for learning
    if had_suggestion = false and NEW.category_id is not null then
      insert into public.categorization_feedback (
        user_id,
        transaction_id,
        from_category_id,
        to_category_id,
        source,
        description_snapshot
      ) values (
        NEW.user_id,
        NEW.id,
        old_category_id,
        new_category_id,
        'manual',
        NEW.description
      );
    end if;
  end if;

  return NEW;
end;
$$;

-- Create trigger to track manual categorizations
drop trigger if exists track_manual_categorization_trigger on public.transactions;
create trigger track_manual_categorization_trigger
  after update of category_id on public.transactions
  for each row
  when (OLD.category_id is distinct from NEW.category_id)
  execute function public.track_manual_categorization();

-- Index for faster rule accuracy queries
create index if not exists rule_usage_rule_user_idx 
  on public.rule_usage(rule_id, user_id, matched_at desc);

-- Index for faster global merchant pattern queries
create index if not exists transactions_category_description_idx
  on public.transactions(category_id, description) 
  where category_id is not null;

-- Function to get rule accuracy stats (for use in confidence calculation)
create or replace function public.get_rule_accuracy_stats(
  p_user_id uuid,
  p_rule_id uuid,
  p_limit_count int default 1000
)
returns table (
  total_matches bigint,
  accepted_matches bigint,
  rejected_matches bigint,
  accuracy numeric
)
language plpgsql
security definer
as $$
begin
  return query
  with rule_usages as (
    select 
      ru.transaction_id,
      ru.was_applied
    from public.rule_usage ru
    where ru.user_id = p_user_id
      and ru.rule_id = p_rule_id
    order by ru.matched_at desc
    limit p_limit_count
  ),
  transaction_status as (
    select
      ru.transaction_id,
      ru.was_applied,
      t.category_id,
      t.suggested_category_id,
      case
        when ru.was_applied = true and t.category_id is not null then true
        when ru.was_applied = false and t.suggested_category_id is not null and t.category_id is null then false
        when ru.was_applied = true and t.category_id is null then false
        else null
      end as was_accepted
    from rule_usages ru
    left join public.transactions t on t.id = ru.transaction_id
  )
  select
    count(*)::bigint as total_matches,
    count(*) filter (where was_accepted = true)::bigint as accepted_matches,
    count(*) filter (where was_accepted = false)::bigint as rejected_matches,
    case
      when count(*) > 0 then
        count(*) filter (where was_accepted = true)::numeric / count(*)::numeric
      else 0::numeric
    end as accuracy
  from transaction_status;
end;
$$;
