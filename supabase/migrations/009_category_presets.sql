-- MyFinance: category presets + preset-backed categorization rules
-- Run after 001-008 migrations.
--
-- This migration introduces:
-- - Global preset metadata tables (no RLS) for reusable category/rule definitions
-- - Optional preset mapping columns on per-user `categories` and `categorization_rules`
-- - A helper RPC `apply_category_preset(preset_key, overwrite)` that materializes
--   a preset into user-owned categories + rules for the authenticated user (auth.uid()).

-- =========================
-- Global preset tables
-- =========================

create table if not exists public.category_presets (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text not null default '',
  version int not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.category_preset_categories (
  id uuid primary key default gen_random_uuid(),
  preset_id uuid not null references public.category_presets(id) on delete cascade,
  canonical_key text not null,
  parent_canonical_key text null,
  name text not null,
  description text not null default '',
  color text not null default '#2196F3',
  display_order int not null default 0,
  constraint category_preset_categories_preset_key_unique unique (preset_id, canonical_key)
);

create table if not exists public.category_preset_rules (
  id uuid primary key default gen_random_uuid(),
  preset_id uuid not null references public.category_presets(id) on delete cascade,
  key text not null,
  name text not null,
  description text not null default '',
  rule_type text not null,
  pattern text not null,
  conditions jsonb not null default '{}'::jsonb,
  target_category_key text not null,
  default_priority int not null default 1,
  default_confidence double precision not null default 0.8,
  is_active boolean not null default true,
  constraint category_preset_rules_preset_rule_key_unique unique (preset_id, key)
);

-- updated_at triggers
create trigger category_presets_set_updated_at
before update on public.category_presets
for each row execute function public.set_updated_at();

create trigger category_preset_categories_set_updated_at
before update on public.category_preset_categories
for each row execute function public.set_updated_at();

create trigger category_preset_rules_set_updated_at
before update on public.category_preset_rules
for each row execute function public.set_updated_at();

-- =========================
-- Per-user mapping columns
-- =========================

alter table public.categories
  add column if not exists preset_key text null,
  add column if not exists preset_category_key text null;

alter table public.categorization_rules
  add column if not exists preset_key text null,
  add column if not exists preset_rule_key text null;

-- Helpful indexes to look up preset-derived rows for a user.
create index if not exists categories_user_preset_key_idx
  on public.categories(user_id, preset_key);

create unique index if not exists categories_user_preset_category_key_unique
  on public.categories(user_id, preset_key, preset_category_key)
  where preset_key is not null
    and preset_category_key is not null;

create index if not exists categorization_rules_user_preset_key_idx
  on public.categorization_rules(user_id, preset_key);

create unique index if not exists categorization_rules_user_preset_rule_key_unique
  on public.categorization_rules(user_id, preset_key, preset_rule_key)
  where preset_key is not null
    and preset_rule_key is not null;

-- =========================
-- RPC helper: apply_category_preset
-- =========================

-- Materialize a global preset into per-user categories + rules for auth.uid().
-- This function:
-- - Creates categories for any preset categories the user does not already have.
-- - Creates categorization_rules pointing at those categories, skipping existing rules.
-- - Optionally overwrites existing preset-derived categories/rules for the user.

create or replace function public.apply_category_preset(
  p_preset_key text,
  p_overwrite boolean default false
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_preset_id uuid;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'apply_category_preset: auth.uid() is null';
  end if;

  select id
    into v_preset_id
  from public.category_presets
  where key = p_preset_key
    and is_active = true
  limit 1;

  if v_preset_id is null then
    raise exception 'apply_category_preset: preset % not found or inactive', p_preset_key;
  end if;

  if p_overwrite then
    delete from public.categorization_rules
    where user_id = v_user_id
      and preset_key = p_preset_key;

    delete from public.categories
    where user_id = v_user_id
      and preset_key = p_preset_key;
  end if;

  -- Root categories (no parent_canonical_key)
  insert into public.categories (
    id,
    user_id,
    name,
    parent_id,
    description,
    color,
    is_active,
    preset_key,
    preset_category_key
  )
  select
    gen_random_uuid(),
    v_user_id,
    cpc.name,
    null::uuid,
    coalesce(cpc.description, ''),
    coalesce(cpc.color, '#2196F3'),
    true,
    p_preset_key,
    cpc.canonical_key
  from public.category_preset_categories cpc
  left join public.categories existing
    on existing.user_id = v_user_id
   and existing.preset_key = p_preset_key
   and existing.preset_category_key = cpc.canonical_key
  where cpc.preset_id = v_preset_id
    and cpc.parent_canonical_key is null
    and existing.id is null;

  -- Non-root categories (with parent_canonical_key)
  insert into public.categories (
    id,
    user_id,
    name,
    parent_id,
    description,
    color,
    is_active,
    preset_key,
    preset_category_key
  )
  select
    gen_random_uuid(),
    v_user_id,
    cpc.name,
    parent_cat.id as parent_id,
    coalesce(cpc.description, ''),
    coalesce(cpc.color, '#2196F3'),
    true,
    p_preset_key,
    cpc.canonical_key
  from public.category_preset_categories cpc
  join public.categories parent_cat
    on parent_cat.user_id = v_user_id
   and parent_cat.preset_key = p_preset_key
   and parent_cat.preset_category_key = cpc.parent_canonical_key
  left join public.categories existing
    on existing.user_id = v_user_id
   and existing.preset_key = p_preset_key
   and existing.preset_category_key = cpc.canonical_key
  where cpc.preset_id = v_preset_id
    and cpc.parent_canonical_key is not null
    and existing.id is null;

  -- Rules backed by preset categories
  insert into public.categorization_rules (
    id,
    user_id,
    name,
    description,
    rule_type,
    pattern,
    conditions,
    category_id,
    priority,
    is_active,
    case_sensitive,
    match_count,
    last_matched,
    created_by,
    preset_key,
    preset_rule_key
  )
  select
    gen_random_uuid(),
    v_user_id,
    cpr.name,
    coalesce(cpr.description, ''),
    cpr.rule_type,
    cpr.pattern,
    coalesce(cpr.conditions, '{}'::jsonb),
    cat.id as category_id,
    cpr.default_priority,
    true,
    false,
    0,
    null,
    'preset',
    p_preset_key,
    cpr.key
  from public.category_preset_rules cpr
  join public.categories cat
    on cat.user_id = v_user_id
   and cat.preset_key = p_preset_key
   and cat.preset_category_key = cpr.target_category_key
  left join public.categorization_rules existing
    on existing.user_id = v_user_id
   and existing.preset_key = p_preset_key
   and existing.preset_rule_key = cpr.key
  where cpr.preset_id = v_preset_id
    and cpr.is_active = true
    and existing.id is null;

end;
$$;

