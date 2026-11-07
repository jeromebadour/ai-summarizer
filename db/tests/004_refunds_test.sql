-- Proves migration 004. Self-contained; run after all migrations.
\set ON_ERROR_STOP on

delete from usage_events;
delete from users where role <> 'owner';
update settings set monthly_cap_usd = 0.05;
insert into users (id, name, username, email, password_hash) values
  ('00000000-0000-0000-0000-0000000000c1', 'Lena Schmidt', 'lena_s', 'lena.s@example.com', 'x');

set role distill_app;
select set_config('app.user_id', '00000000-0000-0000-0000-0000000000c1', false);

do $$
declare r record; q record;
begin
  -- 1. A paid but unusable answer: the use comes back, the cost stays.
  select * into r from claim_use('00000000-0000-0000-0000-0000000000c1');
  perform record_cost(r.use_id, 5000, 300, 0.02);
  assert give_back(r.use_id), 'a paid use could not be given back';
  select * into q from quota_now('00000000-0000-0000-0000-0000000000c1');
  assert q.used_hour = 0 and q.used_day = 0, 'a given-back use still counts against the limit';
  assert (select sum(cost_usd) from usage_events) = 0.02, 'giving the use back erased its cost';

  -- 2. Given back once only, and only by its owner, within 10 minutes.
  assert not give_back(r.use_id), 'a use was given back twice';

  -- 3. Refunded costs still count toward the cap.
  select * into r from claim_use('00000000-0000-0000-0000-0000000000c1');
  perform record_cost(r.use_id, 5000, 300, 0.03);
  perform give_back(r.use_id);
  select * into r from claim_use('00000000-0000-0000-0000-0000000000c1');
  assert not r.ok and r.reason = 'cap', 'refunded spend did not count toward the cap';
end $$;
reset role;

-- 4. An old use can't be given back.
update settings set monthly_cap_usd = 8;
insert into usage_events (user_id, is_guest, created_at)
values ('00000000-0000-0000-0000-0000000000c1', false, now() - interval '11 minutes');
set role distill_app;
do $$ begin
  assert not give_back((select max(id) from usage_events where created_at < now() - interval '10 minutes')),
    'a use older than 10 minutes was given back';
end $$;
reset role;

select 'all 004 checks passed' as result;
