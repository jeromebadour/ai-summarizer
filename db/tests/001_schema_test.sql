-- Proves the schema's promises. Run on a fresh database after the migrations; any failed check stops with an error.
-- Setup runs as the owner; every check runs as distill_app, the role the app uses.
\set ON_ERROR_STOP on

insert into users (id, name, username, email, password_hash, role) values
  ('00000000-0000-0000-0000-000000000001', 'Jerome Badour', 'jerome', 'jerome@example.com', 'x', 'owner'),
  ('00000000-0000-0000-0000-000000000002', 'Maya Klein', 'maya_k', 'maya.k@example.com', 'x', 'user'),
  ('00000000-0000-0000-0000-000000000003', 'Kevin Novak', 'kevin_n', 'kevin.n@example.com', 'x', 'user');
insert into users (id, name, username, role) values ('00000000-0000-0000-0000-000000000004', 'Guest 31', 'guest-31', 'guest');
insert into summaries (user_id, title, source_text, sentences, points, length, model, input_tokens, output_tokens,
  cost_usd, seconds, words_in, words_out)
values ('00000000-0000-0000-0000-000000000002', 'Maya''s', 'private text', '[]', '[]', 'medium', 'm', 1, 1, 0.001, 1, 2, 1),
       ('00000000-0000-0000-0000-000000000003', 'Kevin''s', 'other text', '[]', '[]', 'short', 'm', 1, 1, 0.001, 1, 2, 1);

set role distill_app;

-- 1. Nobody acting: nothing is visible.
do $$ begin
  assert (select count(*) from users) = 0, 'users visible with no acting user';
  assert (select count(*) from summaries) = 0, 'summaries visible with no acting user';
end $$;

-- 2. Acting as Maya: only Maya's rows, even with no WHERE.
select set_config('app.user_id', '00000000-0000-0000-0000-000000000002', false);
do $$ begin
  assert (select count(*) from users) = 1, 'Maya sees other users';
  assert (select count(*) from summaries) = 1, 'Maya sees other summaries';
  assert (select title from summaries) = 'Maya''s', 'Maya sees the wrong summary';
end $$;

-- 3. Maya can't write as Kevin, update a summary, or touch the usage table directly.
do $$ begin
  begin
    insert into summaries (user_id, title, source_text, sentences, points, length, model, input_tokens, output_tokens,
      cost_usd, seconds, words_in, words_out)
    values ('00000000-0000-0000-0000-000000000003', 'forged', 't', '[]', '[]', 'short', 'm', 1, 1, 0, 1, 1, 1);
    raise exception 'Maya wrote a summary as Kevin';
  exception when insufficient_privilege then null; end;
  begin
    update summaries set title = 'changed';
    raise exception 'summaries can be updated';
  exception when insufficient_privilege then null; end;
  begin
    insert into usage_events (user_id, is_guest) values ('00000000-0000-0000-0000-000000000002', false);
    raise exception 'usage written directly';
  exception when insufficient_privilege then null; end;
  begin
    delete from audit_log;
    raise exception 'audit log can be deleted';
  exception when insufficient_privilege then null; end;
end $$;

-- 4. The hourly limit: 10 uses, the 11th refused with the time the oldest frees up.
do $$
declare r record; i int;
begin
  for i in 1..10 loop
    select * into r from claim_use('00000000-0000-0000-0000-000000000002');
    assert r.ok, 'use ' || i || ' refused: ' || coalesce(r.reason, '?');
  end loop;
  select * into r from claim_use('00000000-0000-0000-0000-000000000002');
  assert not r.ok and r.reason = 'hour' and r.used_hour = 10 and r.next_free_at > now(), 'the 11th use was not refused';
end $$;

-- 5. A failure gives the use back.
do $$
declare r record; last_use bigint;
begin
  select max(id) into last_use from usage_events;
  assert give_back(last_use), 'give_back did not return the use';
  select * into r from claim_use('00000000-0000-0000-0000-000000000002');
  assert r.ok, 'the given-back use could not be taken again';
end $$;

-- 6. Claiming for someone else is refused.
do $$ begin
  begin
    perform claim_use('00000000-0000-0000-0000-000000000003');
    raise exception 'claimed a use for another user';
  exception when raise_exception then
    if sqlerrm not like 'claim_use: not the acting user%' then raise; end if;
  end;
end $$;

-- 7. Guests: 5 an hour.
select set_config('app.user_id', '00000000-0000-0000-0000-000000000004', false);
do $$
declare r record; i int;
begin
  for i in 1..5 loop
    select * into r from claim_use('00000000-0000-0000-0000-000000000004');
    assert r.ok, 'guest use ' || i || ' refused';
  end loop;
  select * into r from claim_use('00000000-0000-0000-0000-000000000004');
  assert not r.ok and r.reason = 'hour' and r.limit_hour = 5, 'guest 6th use not refused';
end $$;

-- 8. Sign-in lookups answer without exposing anything else.
do $$ begin
  assert (select count(*) from find_account('MAYA_K')) = 1, 'username sign-in lookup failed';
  assert (select count(*) from find_account('maya.k@example.com')) = 1, 'email sign-in lookup failed';
  assert (select count(*) from find_account('guest-31')) = 0, 'a guest can be signed into';
  assert username_taken('Kevin_N') and not username_taken('nobody_here'), 'username check wrong';
end $$;

reset role;

-- 9. The app cap: once the month's spend reaches it, uses are refused calmly.
-- (Spend is read from the usage ledger since migration 002.)
update usage_events set cost_usd = 0.01, recorded = true;
update settings set daily_cap_usd = least(3, 0.02), monthly_cap_usd = 0.02;
set role distill_app;
select set_config('app.user_id', '00000000-0000-0000-0000-000000000003', false);
do $$
declare r record;
begin
  select * into r from claim_use('00000000-0000-0000-0000-000000000003');
  assert not r.ok and r.reason = 'cap', 'the app cap did not stop new uses';
end $$;
reset role;

-- 10. A staff reset starts Kevin's hour again; suspension refuses everything.
update settings set daily_cap_usd = least(3, 8), monthly_cap_usd = 8;
insert into usage_events (user_id, is_guest) select '00000000-0000-0000-0000-000000000003', false from generate_series(1, 10);
update users set limit_reset_at = now() where username = 'kevin_n';
set role distill_app;
do $$
declare r record;
begin
  select * into r from claim_use('00000000-0000-0000-0000-000000000003');
  assert r.ok and r.used_hour = 1, 'the reset did not start the hour again';
end $$;
reset role;
update users set suspended_at = now() where username = 'kevin_n';
set role distill_app;
do $$
declare r record;
begin
  select * into r from claim_use('00000000-0000-0000-0000-000000000003');
  assert not r.ok and r.reason = 'suspended', 'a suspended user could still use it';
end $$;
reset role;

select 'all schema checks passed' as result;
