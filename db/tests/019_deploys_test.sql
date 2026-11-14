-- Proves migration 019. Self-contained; run after all migrations.
\set ON_ERROR_STOP on
delete from deploys;

-- Before any deploy: an empty feed, never an error.
set role distill_app;
do $$ begin
  assert public_deploys() = '{"live_since": null, "deploys": [], "commit": null}'::jsonb, public_deploys()::text;
end $$;
reset role;

-- The collector records deploys, and nothing but a commit; it reads nothing.
set role distill_collector;
select record_deploy('1111111');
select record_deploy('2222222aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
do $$ begin
  begin
    perform record_deploy('main; drop table users');
    assert false, 'a deploy that is not a commit was recorded';
  exception when others then
    assert sqlerrm like 'collector: not a commit%', sqlerrm;
  end;
  begin
    perform 1 from deploys limit 1;
    assert false, 'the collector can read the deploys';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public_deploys();
    assert false, 'the collector can read the feed';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Days in UTC, each once, oldest first; the commit is the latest deploy's, kept to seven characters.
update deploys set deployed_at = '2026-11-07 09:00+00' where commit = '1111111';
update deploys set deployed_at = '2026-11-09 01:30+03' where commit = '2222222';
insert into deploys (deployed_at, commit) values ('2026-11-07 18:00+00', '3333333');

-- The app reads the feed and writes nothing.
set role distill_app;
do $$ begin
  assert public_deploys() = '{"live_since": "2026-11-07", "deploys": ["2026-11-07", "2026-11-08"], "commit": "2222222"}'::jsonb,
    public_deploys()::text;
  begin
    perform record_deploy('4444444');
    assert false, 'the app can record a deploy';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into deploys (commit) values ('4444444');
    assert false, 'the app can write a deploy';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from deploys limit 1;
    assert false, 'the app can read the deploys table';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
