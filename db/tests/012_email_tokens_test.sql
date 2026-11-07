-- Proves migration 012. Self-contained; run after all migrations.
\set ON_ERROR_STOP on
delete from email_tokens;
delete from usage_events;
delete from sessions;
update users set role = 'user' where role = 'owner';
delete from users;
-- d1: signed up before the rule (made verified by the migration's update, repeated here); d2: a new sign-up.
insert into users (id, name, username, email, password_hash, email_verified_at) values
  ('00000000-0000-0000-0000-0000000000d1', 'Lena Schmidt', 'lena_s', 'lena@example.com', 'x', now()),
  ('00000000-0000-0000-0000-0000000000d2', 'Maya Klein', 'maya_k', 'maya@example.com', 'x', null),
  ('00000000-0000-0000-0000-0000000000d3', 'Noah Becker', 'noahb', 'noah@example.com', 'x', now());
insert into sessions (token_hash, user_id) values ('\x01', '00000000-0000-0000-0000-0000000000d3'), ('\x02', '00000000-0000-0000-0000-0000000000d3');

-- Unverified: no use can be recorded, whoever writes it (the owner role here, past every grant).
do $$ begin
  begin
    insert into usage_events (user_id, is_guest, cost_usd, recorded) values ('00000000-0000-0000-0000-0000000000d2', false, 0, false);
    assert false, 'an unverified account recorded a use';
  exception when others then
    assert sqlerrm = 'email_unverified', sqlerrm;
  end;
end $$;

set role distill_app;
do $$
declare j jsonb; r text; u uuid;
begin
  -- The app can't change an email directly any more.
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000d2', true);
  begin
    update users set email = 'x@example.com';
    assert false, 'the app changed an email directly';
  exception when insufficient_privilege then null;
  end;

  -- A code is sent; the waiting screen knows.
  j := issue_verify(sha256('111111'), sha256('link-1'));
  assert j->>'email' = 'maya@example.com' and j->>'name' = 'Maya Klein', j::text;
  assert (verify_waiting()->>'needed')::boolean and (verify_waiting()->>'live')::boolean, verify_waiting()::text;

  -- A new code ends the old one: the old code and link no longer work.
  perform issue_verify(sha256('222222'), sha256('link-2'));
  assert verify_by_code(sha256('111111')) = 'wrong', 'the replaced code still worked';
  assert verify_by_link(sha256('link-1')) is null, 'the replaced link still worked';

  -- Wrong guesses: four say "wrong", the fifth ends it.
  r := verify_by_code(sha256('000001')); assert r = 'wrong', r;
  r := verify_by_code(sha256('000002')); assert r = 'wrong', r;
  r := verify_by_code(sha256('000003')); assert r = 'wrong', r;
  r := verify_by_code(sha256('000004')); assert r = 'expired', '5 wrong (with the one above) did not end the code: ' || r;
  assert verify_by_code(sha256('222222')) = 'expired', 'the right code worked after five wrong ones';

  -- A fresh code: right once, then used.
  perform issue_verify(sha256('333333'), sha256('link-3'));
  assert verify_by_code(sha256('333333')) = 'ok', 'the right code was refused';
  assert verify_by_code(sha256('333333')) = 'expired', 'a code worked twice';
  assert not (verify_waiting()->>'needed')::boolean, 'still waiting after confirming';
  assert issue_verify(sha256('444444'), sha256('link-4')) is null, 'a confirmed account was sent another code';
end $$;
reset role;

do $$ begin
  assert (select email_verified_at is not null from users where id = '00000000-0000-0000-0000-0000000000d2'), 'not confirmed';
  -- The backstop lets a confirmed account through.
  insert into usage_events (user_id, is_guest, cost_usd, recorded) values ('00000000-0000-0000-0000-0000000000d2', false, 0, false);
end $$;

set role distill_app;
do $$
declare r text; u uuid; i int;
begin
  -- An email change waits in pending_email until the new address confirms it, by the link, from any browser.
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000d1', true);
  update users set pending_email = 'lena.new@example.com';
  perform issue_verify(sha256('555555'), sha256('link-5'));
  perform set_config('app.user_id', '', true);
  u := verify_by_link(sha256('link-5'));
  assert u = '00000000-0000-0000-0000-0000000000d1', 'the link did not confirm the new email';
  assert verify_by_link(sha256('link-5')) is null, 'a link worked twice';

  -- Rate limit: six codes in an hour is too many.
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000d1', true);
  update users set pending_email = 'lena.third@example.com';
  begin
    for i in 1..6 loop perform issue_verify(sha256(('9' || i)::bytea), sha256(('rl-' || i)::bytea)); end loop;
    assert false, 'six codes were sent in an hour';
  exception when others then
    assert sqlerrm like 'email: too many%', sqlerrm;
  end;

  -- Forgot password: an unknown email gets the same silence as a known one (the app answers the same).
  perform set_config('app.user_id', '', true);
  assert issue_reset('nobody@example.com', sha256('1'), sha256('r-0')) is null, 'an unknown email was answered';
  assert (issue_reset('NOAH@example.com', sha256('666666'), sha256('r-1'))->>'name') = 'Noah Becker', 'a known email got nothing';
  r := reset_code_to_link('nobody@example.com', sha256('666666'), sha256('r-x')); assert r = 'expired', r;
  r := reset_code_to_link('noah@example.com', sha256('000000'), sha256('r-x')); assert r = 'wrong', r;
  r := reset_code_to_link('noah@example.com', sha256('666666'), sha256('r-2')); assert r = 'ok', r;
  assert reset_code_to_link('noah@example.com', sha256('666666'), sha256('r-3')) <> 'ok', 'a reset code worked twice';
  assert reset_link_email(sha256('r-1')) is null, 'the emailed link still worked after the code was used';
  assert reset_link_email(sha256('r-2')) = 'noah@example.com', 'the swapped link does not show its email';

  u := reset_by_link(sha256('r-2'), 'new-hash');
  assert u = '00000000-0000-0000-0000-0000000000d3', 'the reset did not go through';
  assert reset_by_link(sha256('r-2'), 'again') is null, 'a reset link worked twice';
end $$;
reset role;

do $$ begin
  assert (select email from users where id = '00000000-0000-0000-0000-0000000000d1') = 'lena.new@example.com', 'the new email was not applied';
  assert (select pending_email from users where id = '00000000-0000-0000-0000-0000000000d1') = 'lena.third@example.com', 'a later pending change was lost';
  assert (select password_hash from users where id = '00000000-0000-0000-0000-0000000000d3') = 'new-hash', 'the password did not change';
  assert (select count(*) from sessions where user_id = '00000000-0000-0000-0000-0000000000d3') = 0, 'the reset left sessions open';
  assert not exists (select 1 from email_tokens where code_hash = sha256('666666')), 'a used reset code is still stored';
end $$;

-- A guest who makes an account must confirm the new email too.
insert into users (id, name, username, role) values ('00000000-0000-0000-0000-0000000000d9', 'Guest 9', 'guest-9', 'guest');
set role distill_app;
do $$ begin
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000d9', true);
  perform upgrade_guest('Ada Lind', 'ada_l', 'ada@example.com', 'x');
end $$;
reset role;
do $$ begin
  assert (select role = 'user' and email_verified_at is null from users where id = '00000000-0000-0000-0000-0000000000d9'),
    'an upgraded guest started confirmed';
end $$;

-- Nobody but the app's own functions reads the tokens.
set role distill_app;
do $$ begin
  begin
    perform 1 from email_tokens limit 1;
    assert false, 'the app can read the tokens';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
\echo 012 email tokens: all checks passed
