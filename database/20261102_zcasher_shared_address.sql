-- ZNS names and zcash.me usernames may share a unified address.
-- Identity is the name/slug, not the UA.

begin;

alter table public.zcasher
  drop constraint if exists zcasher_address_key;

drop index if exists zcasher_address_key;
drop index if exists zcasher_address_uidx;

commit;
