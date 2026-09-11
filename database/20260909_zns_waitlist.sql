-- Zcash.me waitlist reservation without email confirmation.
-- Run in the shared Supabase project.
--
-- Origin for Zcash.me rows is zn_waitlist.zcasher_id (not email_verified).
-- Snapshot inclusion: email_verified = true OR zcasher_id is not null.

begin;

alter table public.zcasher
  add column if not exists zns_waitlist_id uuid;

create unique index if not exists zcasher_zns_waitlist_id_key
  on public.zcasher (zns_waitlist_id)
  where zns_waitlist_id is not null;

alter table public.zn_waitlist
  alter column email drop not null;

alter table public.zn_waitlist
  add column if not exists zcasher_id bigint;

create unique index if not exists zn_waitlist_zcasher_id_key
  on public.zn_waitlist (zcasher_id)
  where zcasher_id is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'zn_waitlist_zcasher_id_fkey'
  ) then
    alter table public.zn_waitlist
      add constraint zn_waitlist_zcasher_id_fkey
      foreign key (zcasher_id) references public.zcasher(id)
      on delete set null;
  end if;
end $$;

-- Backfill both pointers from existing Zcash.me reservations.
update public.zn_waitlist as waitlist
set zcasher_id = profile.id
from public.zcasher as profile
where profile.zns_waitlist_id = waitlist.id
  and waitlist.zcasher_id is null;

update public.zcasher as profile
set zns_waitlist_id = waitlist.id
from public.zn_waitlist as waitlist
where waitlist.zcasher_id = profile.id
  and profile.zns_waitlist_id is null;

-- ZIP-321 Zcash.me rows have no email. Do not leave campaign-facing
-- email_verified set on those rows.
update public.zn_waitlist
set
  email_verified = false,
  email_verified_at = null
where zcasher_id is not null
  and email is null
  and email_verified is true;

commit;

notify pgrst, 'reload schema';
