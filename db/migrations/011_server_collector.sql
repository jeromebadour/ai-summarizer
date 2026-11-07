-- Distill: migration 011. The box reports itself: a collector on the host (ops/collector.py, run every minute by a
-- systemd timer as root) records the four resources each minute and the host's facts every 15 minutes. It signs in as
-- its own role, which can only call the two record functions below: it reads nothing and writes nowhere else.
-- The console reads it all through admin_server(), owners and admins only. Samples are kept 48 hours.

do $$ begin
  if not exists (select from pg_roles where rolname = 'distill_collector') then
    create role distill_collector login;
  end if;
end $$;
-- Reached only over the database container's own socket (docker exec), never over the network.
alter role distill_collector set statement_timeout = '5s';

-- The app never writes the box's readings; only the collector does.
revoke insert on server_samples from distill_app;

create table if not exists server_facts (
  id       smallint primary key default 1 check (id = 1),
  taken_at timestamptz not null default now(),
  facts    jsonb not null check (jsonb_typeof(facts) = 'object')
);
revoke all on server_facts from public;

-- One reading. The database works out its own size and connection count, so the collector only sends what the host
-- knows. A second reading in the same second is ignored; anything older than 48 hours goes.
create or replace function record_server_sample(p_cpu numeric, p_load numeric, p_memory numeric, p_disk numeric) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_cpu not between 0 and 100 or p_memory not between 0 and 100 or p_disk not between 0 and 100 or p_load not between 0 and 1000 then
    raise exception 'collector: reading out of range';
  end if;
  insert into server_samples (taken_at, cpu, load1, memory, disk, db_size_mb, connections)
  values (
    date_trunc('second', now()), p_cpu, p_load, p_memory, p_disk,
    round(pg_database_size(current_database()) / 1048576.0, 2),
    (select count(*) from pg_stat_activity where datname = current_database())
  )
  on conflict (taken_at) do nothing;
  delete from server_samples where taken_at < now() - interval '48 hours';
end $$;

-- The host's facts, replaced as a whole. Only the known keys are kept, so nothing else can ride along.
create or replace function record_server_facts(p_facts jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  allowed text[] := array['os', 'kernel', 'region', 'cpus', 'memoryGb', 'diskGb', 'uptimeSeconds', 'firewallPorts',
                          'bannedNow', 'bannedToday', 'updatesPending', 'sshPasswordOff', 'certExpires', 'appStartedAt'];
  kept jsonb;
begin
  if jsonb_typeof(p_facts) <> 'object' then raise exception 'collector: facts must be an object'; end if;
  select coalesce(jsonb_object_agg(key, value), '{}') into kept from jsonb_each(p_facts) where key = any(allowed);
  insert into server_facts (id, taken_at, facts) values (1, now(), kept)
  on conflict (id) do update set taken_at = excluded.taken_at, facts = excluded.facts;
end $$;

revoke execute on function record_server_sample(numeric, numeric, numeric, numeric) from public;
revoke execute on function record_server_facts(jsonb) from public;
grant execute on function record_server_sample(numeric, numeric, numeric, numeric) to distill_collector;
grant execute on function record_server_facts(jsonb) to distill_collector;

-- Whether the box has reported at all (the Server tab and the Overview's server lines stay hidden until it has).
create or replace function server_reported() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from server_samples)
$$;
revoke execute on function server_reported() from public;
grant execute on function server_reported() to distill_app;

-- The Server tab: the latest reading, one average an hour for the last 48 hours (oldest first; only hours that have
-- readings), the last hour minute by minute (for the first hours, before the hourly line has two points), the host's
-- facts and how old each is. Owners and admins only.
create or replace function admin_server() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare out jsonb;
begin
  perform staff_role(array['owner', 'admin']::user_role[]);
  with hours as (
    select date_trunc('hour', taken_at) as h, avg(cpu) as cpu, avg(load1) as load1, avg(memory) as memory, avg(disk) as disk
    from server_samples where taken_at > now() - interval '48 hours' group by 1
  ),
  latest as (select * from server_samples order by taken_at desc limit 1),
  minutes as (select * from server_samples where taken_at > now() - interval '60 minutes')
  select jsonb_build_object(
    'latest', (select jsonb_build_object('at', taken_at, 'ageSeconds', extract(epoch from now() - taken_at)::int,
                                         'cpu', cpu, 'load', load1, 'memory', memory, 'disk', disk) from latest),
    'series', jsonb_build_object(
      'cpu',    (select coalesce(jsonb_agg(round(cpu, 1) order by h), '[]') from hours),
      'load',   (select coalesce(jsonb_agg(round(load1, 2) order by h), '[]') from hours),
      'memory', (select coalesce(jsonb_agg(round(memory, 1) order by h), '[]') from hours),
      'disk',   (select coalesce(jsonb_agg(round(disk, 1) order by h), '[]') from hours)
    ),
    'minutes', jsonb_build_object(
      'cpu',    (select coalesce(jsonb_agg(cpu order by taken_at), '[]') from minutes),
      'load',   (select coalesce(jsonb_agg(load1 order by taken_at), '[]') from minutes),
      'memory', (select coalesce(jsonb_agg(memory order by taken_at), '[]') from minutes),
      'disk',   (select coalesce(jsonb_agg(disk order by taken_at), '[]') from minutes)
    ),
    'facts', (select facts from server_facts where id = 1),
    'factsAgeSeconds', (select extract(epoch from now() - taken_at)::int from server_facts where id = 1)
  ) into out;
  return out;
end $$;
revoke execute on function admin_server() from public;
grant execute on function admin_server() to distill_app;
