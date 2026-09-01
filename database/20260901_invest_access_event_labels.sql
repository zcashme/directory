-- Store the recipient label on each event so the table is readable without a join.
alter table public.invest_access_events
  add column if not exists password_label text;

update public.invest_access_events as event
set password_label = password.label
from public.invest_access_passwords as password
where event.password_id = password.id
  and event.password_label is null;

alter table public.invest_access_events
  alter column password_label set not null;

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
  matched_password_label text;
begin
  select id, label into matched_password_id, matched_password_label
  from public.invest_access_passwords
  where is_active = true
    and revoked_at is null
    and password_hash = crypt(candidate_password, password_hash)
  limit 1;

  if matched_password_id is null then
    return null;
  end if;

  insert into public.invest_access_events (
    password_id,
    password_label,
    ip_address,
    user_agent
  )
  values (
    matched_password_id,
    matched_password_label,
    nullif(access_ip, '')::inet,
    access_user_agent
  );

  return matched_password_id;
end;
$$;
