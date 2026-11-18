-- Apply before deploying verified profile deletion.
-- A single DELETE must remove profile-owned data atomically. Financial records
-- and waitlist entries survive with their optional profile reference cleared.
begin;

do $$
declare
  dependency record;
  definition text;
  delete_action text;
  deferrability text;
begin
  for dependency in
    select c.conname, c.conrelid::regclass as relation,
           t.relname as table_name, pg_get_constraintdef(c.oid) as definition
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where c.contype = 'f'
      and c.confrelid = 'public.zcasher'::regclass
      and n.nspname = 'public'
      and t.relname in ('zcasher_links', 'zcasher_items', 'zcasher_verifications', 'transactions', 'zn_waitlist')
  loop
    if dependency.table_name in ('transactions', 'zn_waitlist') then
      execute format('alter table %s alter column zcasher_id drop not null', dependency.relation);
      delete_action := 'SET NULL';
    else
      delete_action := 'CASCADE';
    end if;

    definition := regexp_replace(dependency.definition,
      ' ON DELETE (NO ACTION|RESTRICT|CASCADE|SET NULL|SET DEFAULT)', '', 'g');
    -- Keep any deferrability clauses at the end of the constraint definition.
    deferrability := coalesce(substring(definition from ' (?:NOT )?DEFERRABLE.*$'), '');
    definition := regexp_replace(definition, ' (NOT )?DEFERRABLE.*$', '');
    execute format('alter table %s drop constraint %I', dependency.relation, dependency.conname);
    execute format('alter table %s add constraint %I %s ON DELETE %s%s',
      dependency.relation, dependency.conname, definition, delete_action, deferrability);
  end loop;
end;
$$;

commit;
