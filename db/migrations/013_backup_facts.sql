-- Distill: migration 013. The box's collector also reports its backups (ops/backup.sh), the last restore test
-- (ops/restore-test.sh) and when the next backup runs, for the console's Backups card. Same function, three more
-- known facts; anything else is still dropped.
create or replace function record_server_facts(p_facts jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  allowed text[] := array['os', 'kernel', 'region', 'cpus', 'memoryGb', 'diskGb', 'uptimeSeconds', 'firewallPorts',
                          'bannedNow', 'bannedToday', 'updatesPending', 'sshPasswordOff', 'certExpires', 'appStartedAt',
                          'backups', 'restore', 'nextBackup'];
  kept jsonb;
begin
  if jsonb_typeof(p_facts) <> 'object' then raise exception 'collector: facts must be an object'; end if;
  select coalesce(jsonb_object_agg(key, value), '{}') into kept from jsonb_each(p_facts) where key = any(allowed);
  insert into server_facts (id, taken_at, facts) values (1, now(), kept)
  on conflict (id) do update set taken_at = excluded.taken_at, facts = excluded.facts;
end $$;
revoke execute on function record_server_facts(jsonb) from public;
grant execute on function record_server_facts(jsonb) to distill_collector;
