-- Proves migration 008. Self-contained; run after all migrations.
\set ON_ERROR_STOP on

delete from usage_events;
delete from audit_log;
delete from auth_events;
delete from request_errors;
delete from summaries;
delete from sessions;
update users set role = 'user' where role = 'owner';
delete from users;
update settings set monthly_cap_usd = 40, daily_cap_usd = 3, workspace_cap_usd = 50, guests_paused_at = null, all_paused_at = null;
insert into users (id, name, username, email, password_hash, role) values
  ('00000000-0000-0000-0000-0000000000f1', 'Jerome Badour', 'jerome', 'jerome@example.com', 'x', 'owner'),
  ('00000000-0000-0000-0000-0000000000f2', 'Hana Mori', 'hana_m', 'hana@example.com', 'x', 'admin'),
  ('00000000-0000-0000-0000-0000000000f3', 'Lena Schmidt', 'lena_s', 'lena@example.com', 'x', 'moderator'),
  ('00000000-0000-0000-0000-0000000000f4', 'Kevin Novak', 'kevin_n', 'kevin@example.com', 'x', 'user'),
  ('00000000-0000-0000-0000-0000000000f6', 'Paul Weber', 'paul_w', 'paul@example.com', 'x', 'moderator');
insert into users (id, name, username, role) values ('00000000-0000-0000-0000-0000000000f5', 'Guest 9', 'guest-9', 'guest');
insert into sessions (token_hash, user_id) values ('\x01', '00000000-0000-0000-0000-0000000000f4'), ('\x02', '00000000-0000-0000-0000-0000000000f4');
insert into usage_events (user_id, is_guest, cost_usd, recorded) values
  ('00000000-0000-0000-0000-0000000000f4', false, 0.50, true), ('00000000-0000-0000-0000-0000000000f4', false, 0.25, true);

-- Each call must fail with its own message.
create temporary table expect_fail (who uuid, stmt text, msg text) on commit preserve rows;
grant all on expect_fail to distill_app;
insert into expect_fail values
  -- Nobody acts on the owner, on themselves, or on their own rank or above.
  ('00000000-0000-0000-0000-0000000000f2', 'select staff_suspend(''jerome'', ''Testing it out'')', 'staff: not above your role'),
  ('00000000-0000-0000-0000-0000000000f3', 'select staff_suspend(''paul_w'', ''Testing it out'')', 'staff: not above your role'),
  ('00000000-0000-0000-0000-0000000000f3', 'select staff_suspend(''hana_m'', ''Testing it out'')', 'staff: not above your role'),
  ('00000000-0000-0000-0000-0000000000f2', 'select staff_sign_out_all(''hana_m'', ''Testing it out'')', 'staff: not on yourself'),
  ('00000000-0000-0000-0000-0000000000f1', 'select staff_set_role(''jerome'', ''user'', ''Testing it out'')', 'staff: not on yourself'),
  -- The matrix: users act on nobody; moderators can't reset limits; only the owner changes roles and caps.
  ('00000000-0000-0000-0000-0000000000f4', 'select staff_sign_out_all(''guest-9'', ''Testing it out'')', 'staff: not allowed'),
  ('00000000-0000-0000-0000-0000000000f3', 'select staff_reset_limit(''kevin_n'', ''Testing it out'')', 'staff: not allowed'),
  ('00000000-0000-0000-0000-0000000000f2', 'select staff_set_role(''kevin_n'', ''moderator'', ''Testing it out'')', 'staff: not allowed'),
  ('00000000-0000-0000-0000-0000000000f2', 'select staff_set_caps(30, 2, ''Testing it out'')', 'staff: not allowed'),
  ('00000000-0000-0000-0000-0000000000f3', 'select set_pause(''guests'', true, ''Testing it out'')', 'staff: not allowed'),
  ('00000000-0000-0000-0000-0000000000f2', 'select staff_find_account(''kevin_n'')', 'staff: not allowed'),
  -- Every action needs a reason.
  ('00000000-0000-0000-0000-0000000000f3', 'select staff_suspend(''kevin_n'', ''  '')', 'staff: a reason is required'),
  ('00000000-0000-0000-0000-0000000000f2', 'select set_pause(''guests'', false, null)', 'staff: a reason is required'),
  ('00000000-0000-0000-0000-0000000000f3', 'select staff_suspend(''nobody_x'', ''Testing it out'')', 'staff: no such account'),
  -- Roles: no owner, no guests, nothing invented.
  ('00000000-0000-0000-0000-0000000000f1', 'select staff_set_role(''kevin_n'', ''owner'', ''Testing it out'')', 'staff: not a role you can give'),
  ('00000000-0000-0000-0000-0000000000f1', 'select staff_set_role(''guest-9'', ''moderator'', ''Testing it out'')', 'staff: guests cannot hold a role'),
  -- Caps: monthly between this month's spend (0.75) and the workspace limit (50); daily up to the monthly cap.
  ('00000000-0000-0000-0000-0000000000f1', 'select staff_set_caps(0.50, 0.40, ''Testing it out'')', 'staff: monthly cap out of range'),
  ('00000000-0000-0000-0000-0000000000f1', 'select staff_set_caps(60, 3, ''Testing it out'')', 'staff: monthly cap out of range'),
  ('00000000-0000-0000-0000-0000000000f1', 'select staff_set_caps(40, 41, ''Testing it out'')', 'staff: daily cap out of range'),
  ('00000000-0000-0000-0000-0000000000f1', 'select staff_set_caps(40, 0.50, ''Testing it out'')', 'staff: daily cap out of range'),
  ('00000000-0000-0000-0000-0000000000f1', 'select staff_set_caps(40.005, 3, ''Testing it out'')', 'staff: monthly cap out of range');

set role distill_app;

-- 1. Every refusal above refuses with its own message, and leaves no trace.
do $$
declare f record; got text;
begin
  for f in select * from expect_fail loop
    perform set_config('app.user_id', f.who::text, true);
    got := null;
    begin
      execute f.stmt;
    exception when others then got := sqlerrm;
    end;
    assert got = f.msg, format('%s: expected %L, got %L', f.stmt, f.msg, got);
  end loop;
  assert (select count(*) from audit_log) = 0, 'a refused action left an audit row';
end $$;

-- 2. A moderator suspends a user: signed out at once, logged with the reason, and only once.
do $$
begin
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000f3', true);
  assert staff_suspend('kevin_n', '  Posting spam through shared links  '), 'suspend refused';
  assert not staff_suspend('kevin_n', 'Again, to be sure'), 'suspended twice';
  assert (select count(*) from audit_log where action = 'suspend') = 1;
  assert (select reason || '|' || (details->>'devices') from audit_log where action = 'suspend') = 'Posting spam through shared links|2', 'suspend row wrong';
  assert staff_restore('kevin_n', 'Appeal accepted'), 'restore refused';
  assert not staff_restore('kevin_n', 'Appeal accepted'), 'restored twice';
end $$;
reset role;
do $$ begin
  assert (select suspended_at is null and suspended_reason is null from users where username = 'kevin_n'), 'restore left the suspension';
  assert (select count(*) from sessions where user_id = '00000000-0000-0000-0000-0000000000f4') = 0, 'suspend kept sessions';
  -- claim_use refused a suspended account in 001; prove the flag is what this sets.
end $$;
insert into sessions (token_hash, user_id) values ('\x03', '00000000-0000-0000-0000-0000000000f4');
set role distill_app;

-- 3. Sign out everywhere and reset limit; nothing to do means nothing logged.
do $$
begin
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000f2', true);
  assert staff_sign_out_all('kevin_n', 'Lost phone, asked in support'), 'sign out refused';
  assert not staff_sign_out_all('kevin_n', 'Lost phone, asked in support'), 'signed out nothing but said yes';
  assert staff_reset_limit('kevin_n', 'Client deadline'), 'reset refused';
  assert not staff_reset_limit('kevin_n', 'Client deadline'), 'reset an empty hour';
  assert (select (details->>'used')::int from audit_log where action = 'reset_limit') = 2, 'reset row wrong';
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000f4', true);
  assert (select used_hour from quota_now('00000000-0000-0000-0000-0000000000f4')) = 0, 'the hour did not start again';
  assert (select used_day from quota_now('00000000-0000-0000-0000-0000000000f4')) = 2, 'the reset cleared the day too';
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000f2', true);
  -- An admin acts on a moderator.
  assert staff_suspend('paul_w', 'Testing the hierarchy'), 'admin could not suspend a moderator';
end $$;

-- 4. Roles: grant, change, revoke, each logged as what it was.
do $$
begin
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000f1', true);
  assert staff_set_role('kevin_n', 'moderator', 'Joins support'), 'grant refused';
  assert not staff_set_role('kevin_n', 'moderator', 'Joins support'), 'granted the same role twice';
  assert staff_set_role('kevin_n', 'admin', 'Takes over the server checks'), 'change refused';
  assert staff_set_role('kevin_n', 'user', 'Stepped back'), 'revoke refused';
  assert (select string_agg(action || ':' || (details->>'role') || coalesce(':' || (details->>'from'), ''), ',' order by id)
          from audit_log where action like '%_role') = 'grant_role:moderator,change_role:admin:moderator,revoke_role:admin', 'role rows wrong';
  begin
    perform staff_set_role('paul_w', 'admin', 'Promote while suspended');
    raise exception 'promoted a suspended account';
  exception when raise_exception then
    assert sqlerrm = 'staff: restore them first', sqlerrm;
  end;
  -- The Roles tab lists all three, newest first.
  assert (select string_agg(c->>'action', ',') from jsonb_array_elements(admin_roles()->'changes') c) = 'revoke_role,change_role,grant_role',
    'roles history wrong';
  -- It shows the latest 5 only (Activity has them all).
  perform staff_set_role('kevin_n', 'moderator', 'One');
  perform staff_set_role('kevin_n', 'admin', 'Two');
  perform staff_set_role('kevin_n', 'user', 'Three');
  assert jsonb_array_length(admin_roles()->'changes') = 5, 'the roles preview is not 5 rows';
  assert admin_roles()->'changes'->0->>'reason' = 'Three', 'the preview is not newest first';
  -- The owner finds accounts by username or email, never guests.
  assert staff_find_account('@Kevin_N ')->>'username' = 'kevin_n', 'find by username';
  assert staff_find_account('hana@example.com')->>'role' = 'admin', 'find by email';
  assert staff_find_account('guest-9') is null, 'found a guest';
end $$;

-- 5. Caps and brakes.
do $$
begin
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000f1', true);
  assert staff_set_caps(30, 2.50, 'Quieter month'), 'caps refused';
  assert not staff_set_caps(30, 2.50, 'Quieter month'), 'same caps logged';
  assert (select details from audit_log where action = 'change_caps') = '{"daily": 2.50, "monthly": 30, "fromDaily": 3.00, "fromMonthly": 40.00}'::jsonb,
    (select details::text from audit_log where action = 'change_caps');
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000f2', true);
  assert set_pause('guests', true, 'Guest farming'), 'pause refused';
  assert set_pause('guests', false, 'Farming stopped'), 'resume refused';
  assert (select reason from audit_log where action = 'resume_guests') = 'Farming stopped', 'resume reason lost';
end $$;
reset role;
do $$ begin
  assert (select monthly_cap_usd = 30 and daily_cap_usd = 2.5 from settings), 'caps not saved';
end $$;

-- 6. The app can't write any of this around the functions.
set role distill_app;
do $$ begin
  begin
    update users set suspended_at = null;
    raise exception 'the app wrote suspended_at directly';
  exception when insufficient_privilege then null;
  end;
  begin
    update settings set monthly_cap_usd = 50;
    raise exception 'the app wrote the caps directly';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from audit_log;
    raise exception 'the app deleted audit rows';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- 7. A suspended staff member does nothing.
set role distill_app;
do $$ begin
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000f6', true);
  begin
    perform staff_sign_out_all('guest-9', 'Testing it out');
    raise exception 'a suspended moderator acted';
  exception when raise_exception then
    assert sqlerrm = 'staff: not allowed', sqlerrm;
  end;
end $$;
reset role;

\echo 008 staff actions: all checks passed
