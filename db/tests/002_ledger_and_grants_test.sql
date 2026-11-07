-- Proves migration 002. Run on a fresh database after all migrations (and after 001's test, or alone).
\set ON_ERROR_STOP on

delete from usage_events;
-- Self-contained: the owner exists whether or not 001's test ran first.
insert into users (id, name, username, email, password_hash, role)
values ('00000000-0000-0000-0000-000000000001', 'Jerome Badour', 'jerome', 'jerome@example.com', 'x', 'owner')
on conflict do nothing;
delete from summaries;
delete from users where role <> 'owner';
update settings set daily_cap_usd = least(3, 0.05), monthly_cap_usd = 0.05;
insert into users (id, name, username, email, password_hash) values
  ('00000000-0000-0000-0000-0000000000a1', 'Lena Schmidt', 'lena_s', 'lena.s@example.com', 'x');

set role distill_app;
select set_config('app.user_id', '00000000-0000-0000-0000-0000000000a1', false);

-- 1. A user can't raise their own role, lift a suspension or reset their own limit.
do $$ begin
  begin update users set role = 'admin'; raise exception 'a user changed their own role';
  exception when insufficient_privilege then null; end;
  begin update users set suspended_at = null; raise exception 'a user changed their own suspension';
  exception when insufficient_privilege then null; end;
  begin update users set limit_reset_at = now(); raise exception 'a user reset their own limit';
  exception when insufficient_privilege then null; end;
  -- Ordinary profile edits still work.
  update users set name = 'Lena S.', theme = 'dark';
  assert (select name from users) = 'Lena S.', 'a profile edit was refused';
end $$;

-- 2. Sign-up can't choose a role: an inserted account is always a plain user.
do $$ begin
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000a2', true);
  begin
    insert into users (id, name, username, email, password_hash, role)
    values ('00000000-0000-0000-0000-0000000000a2', 'X', 'xx_x', 'x@example.com', 'x', 'admin');
    raise exception 'sign-up chose its own role';
  exception when insufficient_privilege then null; end;
  insert into users (id, name, username, email, password_hash)
  values ('00000000-0000-0000-0000-0000000000a2', 'Oliver Hart', 'oliver_h', 'oliver.h@example.com', 'x');
  assert (select role from users) = 'user', 'a new account is not a plain user';
end $$;

-- 3. Spend lives in the ledger: deleting summaries or the account does not lower it, and the cap still holds.
select set_config('app.user_id', '00000000-0000-0000-0000-0000000000a2', false);
do $$
declare r record;
begin
  select * into r from claim_use('00000000-0000-0000-0000-0000000000a2');
  assert r.ok, 'first use refused';
  assert record_cost(r.use_id, 1000, 200, 0.05), 'cost not recorded';
  assert not record_cost(r.use_id, 1, 1, 0), 'a use was priced twice';
  -- Since 004 a priced use can be given back (refunded), but its cost stays in the spend.
  assert give_back(r.use_id), 'a priced use could not be given back';
  insert into summaries (user_id, title, source_text, sentences, points, length, model, input_tokens, output_tokens,
    cost_usd, seconds, words_in, words_out)
  values ('00000000-0000-0000-0000-0000000000a2', 't', 's', '[]', '[]', 'short', 'm', 1000, 200, 0.05, 1, 1, 1);
  delete from summaries;
  select * into r from claim_use('00000000-0000-0000-0000-0000000000a2');
  assert not r.ok and r.reason = 'cap', 'deleting a summary lowered the spend under the cap';
end $$;
delete from users;
reset role;
do $$ begin
  assert (select count(*) from usage_events where user_id is null and cost_usd = 0.05) = 1,
    'deleting the account removed its spend';
end $$;
update settings set daily_cap_usd = least(3, 8), monthly_cap_usd = 8;

-- 4. Guests: numbered by the database, limits survive deleting and re-creating.
set role distill_app;
do $$
declare g uuid; r record;
begin
  g := create_guest();
  perform set_config('app.user_id', g::text, true);
  assert (select username from users) like 'guest-%', 'guest has no guest name';
  assert (select role from users) = 'guest', 'guest is not a guest';
  for i in 1..5 loop perform claim_use(g); end loop;
  delete from users;
  g := create_guest();
  perform set_config('app.user_id', g::text, true);
  select * into r from claim_use(g);
  assert r.ok, 'a new guest was refused';
end $$;
reset role;
do $$ begin
  assert (select count(*) from usage_events where is_guest) = 6, 'deleting a guest lowered the guests'' day count';
end $$;
set role distill_app;

-- 5. Upgrading a guest keeps the same row; a real account can't be "upgraded".
do $$
declare g uuid;
begin
  g := create_guest();
  perform set_config('app.user_id', g::text, true);
  perform claim_use(g);
  assert upgrade_guest('Kevin Novak', 'Kevin_N', 'Kevin.N@example.com', 'hash'), 'upgrade refused';
  assert (select role from users) = 'user', 'upgrade did not make a user';
  assert (select username from users) = 'kevin_n', 'username not stored lowercase';
  assert (select count(*) from usage_events where user_id = g) = 1, 'the guest''s uses did not stay attached';
  assert not upgrade_guest('X', 'yyy', 'y@example.com', 'h'), 'a real account was upgraded again';
end $$;

-- 6. The owner can't be deleted.
reset role;
do $$ begin
  begin
    delete from users where role = 'owner';
    raise exception 'the owner was deleted';
  exception when raise_exception then
    if sqlerrm = 'the owner was deleted' then raise; end if;
  end;
end $$;

-- 7. Failed sign-ins are counted per account for the throttle.
insert into auth_events (user_id, kind)
select u.id, 'signin_failed' from users u cross join generate_series(1, 3) where u.role = 'owner';
set role distill_app;
do $$ begin
  assert recent_failures((select id from find_account('jerome'))) = 3, 'failed sign-ins not counted';
end $$;
reset role;

select 'all 002 checks passed' as result;
