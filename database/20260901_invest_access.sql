-- Run this migration in the Supabase SQL editor with a service-role-backed app.
-- Content and password values belong in Supabase, never in this repository.

create extension if not exists pgcrypto;

create table if not exists public.invest_access_passwords (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.invest_access_events (
  id bigint generated always as identity primary key,
  password_id uuid not null references public.invest_access_passwords(id),
  accessed_at timestamptz not null default now(),
  ip_address inet,
  user_agent text
);

create index if not exists invest_access_events_password_id_accessed_at_idx
  on public.invest_access_events (password_id, accessed_at desc);

create table if not exists public.invest_documents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  body_markdown text not null,
  is_published boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.invest_documents
  add column if not exists details jsonb not null default '[]'::jsonb;

alter table public.invest_access_passwords enable row level security;
alter table public.invest_access_events enable row level security;
alter table public.invest_documents enable row level security;

-- This function exposes no password hashes. It returns the matched password UUID
-- only after recording the successful access event.
create or replace function public.validate_and_log_invest_access(
  candidate_password text,
  access_ip text default null,
  access_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  matched_password_id uuid;
begin
  select id into matched_password_id
  from public.invest_access_passwords
  where is_active = true
    and revoked_at is null
    and password_hash = crypt(candidate_password, password_hash)
  limit 1;

  if matched_password_id is null then
    return null;
  end if;

  insert into public.invest_access_events (password_id, ip_address, user_agent)
  values (matched_password_id, nullif(access_ip, '')::inet, access_user_agent);

  return matched_password_id;
end;
$$;

revoke all on function public.validate_and_log_invest_access(text, text, text) from public;
grant execute on function public.validate_and_log_invest_access(text, text, text) to service_role;

-- Example: create a recipient-specific password. Replace both placeholders before running.
-- insert into public.invest_access_passwords (label, password_hash)
-- values ('recipient-name', crypt('replace-with-a-long-unique-password', gen_salt('bf', 12)));

-- Example: create the one private document. Markdown supports headings, paragraphs,
-- bullet lists, quotes, bold text, and http(s)/mailto links.
-- insert into public.invest_documents (slug, title, subtitle, body_markdown, is_published)
-- values ('invest', 'ZcashMe', 'A concise investor brief', E'## Overview\n\nPrivate content goes here.', true);
