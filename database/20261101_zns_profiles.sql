-- Zcash Names profile bindings, reserved canonical URLs, and sync cursor.
-- Run in the shared Supabase project.

begin;

alter table public.zcasher
  add column if not exists zns_name text,
  add column if not exists zns_active boolean not null default false,
  add column if not exists zns_claim_txid text,
  add column if not exists zns_bound_height bigint,
  add column if not exists zns_last_action text,
  add column if not exists zns_expires_at text,
  add column if not exists zns_address_height bigint,
  add column if not exists maxi_source text;

alter table public.zcasher
  drop constraint if exists zcasher_maxi_source_check;

alter table public.zcasher
  add constraint zcasher_maxi_source_check
  check (maxi_source is null or maxi_source in ('paid', 'zns'));

-- Backfill canonical slugs before the unique index.
update public.zcasher
set slug = lower(regexp_replace(coalesce(name, ''), '[^a-zA-Z0-9_]', '', 'g'))
where (slug is null or btrim(slug) = '')
  and address_verified is true
  and coalesce(name, '') <> '';

update public.zcasher
set slug = lower(regexp_replace(coalesce(name, ''), '[^a-zA-Z0-9_]', '', 'g')) || '-' || id::text
where (slug is null or btrim(slug) = '')
  and coalesce(name, '') <> '';

-- Duplicate unsuffixed slugs: keep the lowest verified (then lowest id), suffix the rest.
with ranked as (
  select
    id,
    slug,
    row_number() over (
      partition by slug
      order by case when address_verified is true then 0 else 1 end, id
    ) as rn
  from public.zcasher
  where slug is not null and btrim(slug) <> ''
)
update public.zcasher as profile
set slug = ranked.slug || '-' || profile.id::text
from ranked
where profile.id = ranked.id
  and ranked.rn > 1;

create unique index if not exists zcasher_slug_key
  on public.zcasher (slug)
  where slug is not null and btrim(slug) <> '';

create unique index if not exists zcasher_zns_name_active_key
  on public.zcasher (zns_name)
  where zns_name is not null and zns_active is true;

create table if not exists public.zns_namespace (
  name text primary key,
  reserved_at timestamptz not null default now(),
  first_claim_txid text,
  first_claim_height bigint
);

create table if not exists public.zns_sync_state (
  network text primary key,
  last_height bigint not null default 0,
  last_event_id bigint,
  last_synced_at timestamptz
);

commit;

notify pgrst, 'reload schema';
