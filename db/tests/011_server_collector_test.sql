-- Proves migration 011. Self-contained; run after all migrations.
\set ON_ERROR_STOP on
delete from server_samples;
delete from server_facts;
delete from sessions;
update users set role = 'user' where role = 'owner';
delete from users;
insert into users (id, name, username, email, password_hash, role) values
  ('00000000-0000-0000-0000-0000000000c1', 'Lena Schmidt', 'lena_s', 'lena@example.com', 'x', 'owner'),
  ('00000000-0000-0000-0000-0000000000c2', 'Noah Becker', 'noahb', 'noah@example.com', 'x', 'moderator');

-- Before the box reports: nothing to show.
set role distill_app;
do $$ begin assert not server_reported(), 'reported before any reading'; end $$;
reset role;

-- An old reading (kept by the owner for the test) and two hours of fresh ones.
insert into server_samples (taken_at, cpu, load1, memory, disk, db_size_mb, connections) values
  (now() - interval '49 hours', 99, 9, 99, 99, 1, 1),
  (date_trunc('hour', now()) - interval '1 hour' + interval '5 minutes', 10, 0.2, 30, 14, 1, 1),
  (date_trunc('hour', now()) - interval '1 hour' + interval '6 minutes', 20, 0.4, 32, 14, 1, 1);

-- The collector: it can record, and nothing else.
set role distill_collector;
select record_server_sample(7, 0.42, 38, 14.2);
select record_server_sample(7, 0.42, 38, 14.2);  -- same second: ignored, not an error
select record_server_facts('{"os": "Ubuntu 24.04.5 LTS", "kernel": "6.8.0-149", "cpus": 6, "sshPasswordOff": true,
                             "firewallPorts": [22, 80, 443], "sneaky": "dropped",
                             "backups": {"count": 1, "recent": []}, "restore": {"ok": true}, "nextBackup": "2026-11-09T02:47:00+00:00"}');
do $$ begin
  begin
    perform record_server_sample(140, 0, 0, 0);
    assert false, 'an impossible reading was accepted';
  exception when others then
    assert sqlerrm like 'collector: reading out of range%', sqlerrm;
  end;
  begin
    perform record_server_facts('[1, 2]');
    assert false, 'facts that are not an object were accepted';
  exception when others then
    assert sqlerrm like 'collector: facts must be an object%', sqlerrm;
  end;
  begin
    perform 1 from users limit 1;
    assert false, 'the collector can read users';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from server_samples limit 1;
    assert false, 'the collector can read the readings';
  exception when insufficient_privilege then null;
  end;
  begin
    perform admin_server();
    assert false, 'the collector can call the console read';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

do $$ begin
  assert (select count(*) from server_samples) = 3, 'the 49-hour-old reading was not removed, or a duplicate was kept';
  assert (select facts from server_facts) ? 'os' and not ((select facts from server_facts) ? 'sneaky'), 'an unknown fact was kept';
  assert (select facts ?& array['backups', 'restore', 'nextBackup'] from server_facts), 'the backup facts were dropped (013)';
  assert (select db_size_mb > 0 and connections >= 1 from server_samples order by taken_at desc limit 1), 'the database did not fill its own size';
end $$;

-- The app: can't write readings, can see whether the box reported; the console read is owner / admin only.
set role distill_app;
do $$
declare s jsonb;
begin
  begin
    insert into server_samples (cpu, load1, memory, disk, db_size_mb, connections) values (1, 1, 1, 1, 1, 1);
    assert false, 'the app can write readings';
  exception when insufficient_privilege then null;
  end;
  begin
    perform record_server_sample(1, 1, 1, 1);
    assert false, 'the app can record readings';
  exception when insufficient_privilege then null;
  end;
  assert server_reported(), 'not reported after a reading';

  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000c2', true);
  begin
    perform admin_server();
    assert false, 'a moderator read the server';
  exception when others then
    assert sqlerrm like 'staff: not allowed%', sqlerrm;
  end;

  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000c1', true);
  s := admin_server();
  assert (s->'latest'->>'cpu')::numeric = 7 and (s->'latest'->>'ageSeconds')::int < 60, 'latest: ' || s::text;
  assert jsonb_array_length(s->'series'->'cpu') = 2, 'one value per hour with readings: ' || (s->'series')::text;
  assert (s->'series'->'cpu'->>0)::numeric = 15, 'the hour is an average: ' || (s->'series')::text;
  assert s->'facts'->>'kernel' = '6.8.0-149', 'facts: ' || s::text;
end $$;
reset role;
\echo 011 server collector: all checks passed
