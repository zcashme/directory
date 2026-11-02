-- Per-link authentication timestamp for profile card check/X details.
alter table public.zcasher_links
  add column if not exists verified_at timestamptz;

update public.zcasher_links
set verified_at = updated_at
where is_verified is true
  and verified_at is null
  and updated_at is not null;
