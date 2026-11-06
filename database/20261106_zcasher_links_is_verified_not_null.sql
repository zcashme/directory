-- Normalize legacy link rows before enforcing the boolean verification invariant.
update public.zcasher_links
set is_verified = false
where is_verified is null;

alter table public.zcasher_links
  alter column is_verified set default false;

alter table public.zcasher_links
  alter column is_verified set not null;
