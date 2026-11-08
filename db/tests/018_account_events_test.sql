-- Proves migration 018. Self-contained; run after all migrations.
\set ON_ERROR_STOP on
delete from email_tokens;
delete from auth_events;
delete from usage_events;
delete from sessions;
update users set role = 'user' where role = 'owner';
delete from users;
insert into users (id, name, username, email, password_hash, role, email_verified_at, pending_email) values
  ('00000000-0000-0000-0000-0000000000e1', 'Jerome Badour', 'jerome', 'jerome@example.com', 'x', 'owner', now(), null),
  ('00000000-0000-0000-0000-0000000000e2', 'Maya Klein', 'maya_k', 'maya@example.com', 'x', 'user', null, null),
  ('00000000-0000-0000-0000-0000000000e3', 'Noah Becker', 'noahb', 'noah@example.com', 'x', 'user', now(), 'noah.b@example.com');
insert into sessions (token_hash, user_id) values ('\x03', '00000000-0000-0000-0000-0000000000e3');

set role distill_app;
do $$
declare a jsonb; r text;
begin
  -- A new account confirms its first address: one event, no detail.
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000e2', true);
  perform issue_verify(sha256('111111'), sha256('link-1'));
  r := verify_by_code(sha256('999999'));
  assert r = 'wrong', r;
  assert (select count(*) from auth_events) = 0, 'a wrong code was logged as confirmed';
  assert verify_by_code(sha256('111111')) = 'ok', 'the right code was refused';

  -- A changed address, confirmed by the link: logged as a change, without the address.
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000e3', true);
  perform issue_verify(sha256('222222'), sha256('link-2'));
  assert verify_by_link(sha256('link-2')) = '00000000-0000-0000-0000-0000000000e3', 'the link was refused';

  -- Forgot password, then the new password: one reset event. A used link logs nothing more.
  perform set_config('app.user_id', '', true);
  perform issue_reset('maya@example.com', sha256('333333'), sha256('reset-1'));
  assert reset_by_link(sha256('reset-1'), 'new-hash') = '00000000-0000-0000-0000-0000000000e2', 'the reset link was refused';
  assert reset_by_link(sha256('reset-1'), 'again') is null, 'a reset link worked twice';

  -- The console names them, and the kind filter finds each.
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000e1', true);
  a := admin_activity(null, null, 15, 0);
  assert (a->>'total')::int = 3, 'expected three events: ' || a::text;
  assert (a->'counts'->>'emailConfirmed')::int = 2 and (a->'counts'->>'passwordReset')::int = 1, 'counts wrong: ' || (a->'counts')::text;
  a := admin_activity(array['emailConfirmed'], null, 15, 0);
  assert (a->>'total')::int = 2, 'emailConfirmed filter wrong: ' || a::text;
  assert (select string_agg(x->>'detail', ',' order by x->'person'->>'username') from jsonb_array_elements(a->'rows') x) = ',changed',
    'details wrong: ' || a::text;
  assert position('example.com' in a::text) = 0, 'an address reached the Activity log';
  a := admin_activity(array['passwordReset'], 'maya_k', 15, 0);
  assert (a->>'total')::int = 1, 'passwordReset filter wrong: ' || a::text;
end $$;
reset role;

-- The app still can't write other kinds of its own.
do $$ begin
  begin
    insert into auth_events (kind) values ('made_up');
    assert false, 'an unknown kind was accepted';
  exception when check_violation then null;
  end;
end $$;
\echo 018 account events: all checks passed
