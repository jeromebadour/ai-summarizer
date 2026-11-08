-- Distill: migration 017. The box's collector also reports the off-box copy of the backups (ops/offsite.sh)
-- for the console's Backups card: when it last went up, whether it worked, how many are kept. One more known
-- fact; anything else is still dropped.
create or replace function record_server_facts(p_facts jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  allowed text[] := array['os', 'kernel', 'region', 'cpus', 'memoryGb', 'diskGb', 'uptimeSeconds', 'firewallPorts',
                          'bannedNow', 'bannedToday', 'updatesPending', 'sshPasswordOff', 'certExpires', 'appStartedAt',
                          'backups', 'restore', 'nextBackup', 'offsite'];
  kept jsonb;
begin
  if jsonb_typeof(p_facts) <> 'object' then raise exception 'collector: facts must be an object'; end if;
  select coalesce(jsonb_object_agg(key, value), '{}') into kept from jsonb_each(p_facts) where key = any(allowed);
  insert into server_facts (id, taken_at, facts) values (1, now(), kept)
  on conflict (id) do update set taken_at = excluded.taken_at, facts = excluded.facts;
end $$;
revoke execute on function record_server_facts(jsonb) from public;
grant execute on function record_server_facts(jsonb) to distill_collector;
