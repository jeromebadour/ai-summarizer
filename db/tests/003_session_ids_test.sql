-- Proves migration 003. Self-contained; run after all migrations.
\set ON_ERROR_STOP on

delete from usage_events;
delete from sessions;
delete from users where role <> 'owner';
update settings set daily_cap_usd = least(3, 8), monthly_cap_usd = 8;
insert into users (id, name, username, email, password_hash) values
  ('00000000-0000-0000-0000-0000000000b1', 'Kevin Novak', 'kevin_n', 'kevin.n@example.com', 'x'),
  ('00000000-0000-0000-0000-0000000000b2', 'Oliver Hart', 'oliver_h', 'oliver.h@example.com', 'x');
insert into sessions (token_hash, user_id) values
  (sha256('a'), '00000000-0000-0000-0000-0000000000b1'),
  (sha256('b'), '00000000-0000-0000-0000-0000000000b2');

set role distill_app;
select set_config('app.user_id', '00000000-0000-0000-0000-0000000000b1', false);

-- 1. Every session has its own public id; a user sees and can sign out only their own.
do $$ begin
  assert (select count(*) from sessions where id is not null) = 1, 'session id missing or other sessions visible';
  delete from sessions where id = (select max(id) from sessions);
  reset role;
  assert (select count(*) from sessions) = 1, 'deleting by id touched the wrong session';
end $$;

-- 2. The ring and the check agree: quota_now says what claim_use then does, use by use.
set role distill_app;
select set_config('app.user_id', '00000000-0000-0000-0000-0000000000b1', false);
do $$
declare q record; r record;
begin
  for i in 1..11 loop
    select * into q from quota_now('00000000-0000-0000-0000-0000000000b1');
    select * into r from claim_use('00000000-0000-0000-0000-0000000000b1');
    assert r.ok = (q.used_hour < q.limit_hour), format('use %s: ring said %s/%s but check said %s', i, q.used_hour, q.limit_hour, r.ok);
  end loop;
  select * into q from quota_now('00000000-0000-0000-0000-0000000000b1');
  assert q.used_hour = 10 and q.limit_hour = 10 and q.used_day = 10 and q.limit_day = 30, 'ring numbers wrong after 10 uses';
  assert q.next_free_at > now() + interval '59 minutes', 'next free time wrong';
end $$;

-- 3. Nobody can read someone else's quota.
do $$ begin
  begin
    perform * from quota_now('00000000-0000-0000-0000-0000000000b2');
    raise exception 'read another user''s quota';
  exception when raise_exception then
    if sqlerrm = 'read another user''s quota' then raise; end if;
  end;
end $$;
reset role;

select 'all 003 checks passed' as result;
