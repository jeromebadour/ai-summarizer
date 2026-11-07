-- Proves migration 006. Self-contained; run after all migrations.
\set ON_ERROR_STOP on

delete from usage_events;
delete from users where role <> 'owner';
update settings set daily_cap_usd = 3, monthly_cap_usd = 40, guests_paused_at = null, all_paused_at = null;
insert into users (id, name, username, email, password_hash) values
  ('00000000-0000-0000-0000-0000000000e1', 'Lena Schmidt', 'lena_s', 'lena.s@example.com', 'x');

set role distill_app;
do $$
declare s record;
begin
  -- 1. Callable with nobody signed in (the sign-in page needs it too); all clear by default.
  select * into s from app_state();
  assert not s.all_paused and not s.guests_paused and not s.daily_cap_reached and not s.month_cap_reached, 'not all clear';
  assert s.day_resets_at = date_trunc('day', now()) + interval '1 day', 'wrong reset time';
end $$;
reset role;

-- 2. Pauses and caps show; spend from users the caller can't see still counts.
update settings set guests_paused_at = now();
insert into usage_events (user_id, is_guest, cost_usd, recorded) values ('00000000-0000-0000-0000-0000000000e1', false, 3.00, true);
set role distill_app;
do $$
declare s record;
begin
  select * into s from app_state();
  assert s.guests_paused and s.daily_cap_reached and not s.month_cap_reached, 'pause or daily cap not shown';
  -- The app role still can't read the rows behind the sum.
  assert (select count(*) from usage_events) = 0, 'usage rows leaked';
end $$;
reset role;
update settings set daily_cap_usd = 3, monthly_cap_usd = 3, guests_paused_at = null;
set role distill_app;
do $$ begin
  assert (select month_cap_reached from app_state()), 'month cap not shown';
end $$;
reset role;
update settings set daily_cap_usd = 3, monthly_cap_usd = 40;

select 'all 006 checks passed' as result;
