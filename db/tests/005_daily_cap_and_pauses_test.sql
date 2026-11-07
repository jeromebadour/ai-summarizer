-- Proves migration 005. Self-contained; run after all migrations.
\set ON_ERROR_STOP on

delete from usage_events;
delete from audit_log;
delete from users where role <> 'owner';
update settings set daily_cap_usd = 3, monthly_cap_usd = 40, guests_paused_at = null, guests_paused_by = null,
  guests_paused_reason = null, all_paused_at = null, all_paused_by = null, all_paused_reason = null;
insert into users (id, name, username, email, password_hash, role)
values ('00000000-0000-0000-0000-000000000001', 'Jerome Badour', 'jerome', 'jerome@example.com', 'x', 'owner')
on conflict do nothing;
insert into users (id, name, username, email, password_hash, role) values
  ('00000000-0000-0000-0000-0000000000d1', 'Lena Schmidt', 'lena_s', 'lena.s@example.com', 'x', 'user'),
  ('00000000-0000-0000-0000-0000000000d2', 'Kevin Novak', 'kevin_n', 'kevin.n@example.com', 'x', 'admin'),
  ('00000000-0000-0000-0000-0000000000d3', 'Oliver Hart', 'oliver_h', 'oliver.h@example.com', 'x', 'moderator');
insert into users (id, name, username, role) values ('00000000-0000-0000-0000-0000000000d4', 'Guest 77', 'guest-77', 'guest');

-- 1. The defaults Kami chose; a daily cap above the monthly cap is refused.
do $$ begin
  assert (select monthly_cap_usd = 40 and workspace_cap_usd = 50 and daily_cap_usd = 3 from settings), 'budget defaults wrong';
  begin
    update settings set daily_cap_usd = 41;
    raise exception 'a daily cap above the monthly cap was accepted';
  exception when check_violation then null; end;
end $$;

set role distill_app;

-- 2. Only owners and admins pause, with a reason; users and moderators can't.
do $$ begin
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000d1', true);
  begin perform set_pause('guests', true, 'abuse'); raise exception 'a user paused guests';
  exception when raise_exception then if sqlerrm = 'a user paused guests' then raise; end if; end;
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000d3', true);
  begin perform set_pause('guests', true, 'abuse'); raise exception 'a moderator paused guests';
  exception when raise_exception then if sqlerrm = 'a moderator paused guests' then raise; end if; end;
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000d2', true);
  begin perform set_pause('guests', true, ''); raise exception 'paused without a reason';
  exception when raise_exception then if sqlerrm = 'paused without a reason' then raise; end if; end;
  assert set_pause('guests', true, 'Guest farming from one network'), 'an admin could not pause guests';
  assert not set_pause('guests', true, 'again'), 'pausing twice changed something';
end $$;

-- 3. Guests paused: no new guests, guests refused; accounts keep working.
do $$
declare r record;
begin
  assert create_guest() is null, 'a guest was created while guests are paused';
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000d4', true);
  select * into r from claim_use('00000000-0000-0000-0000-0000000000d4');
  assert not r.ok and r.reason = 'guests_paused', 'a guest could still summarize';
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000d1', true);
  select * into r from claim_use('00000000-0000-0000-0000-0000000000d1');
  assert r.ok, 'an account was refused while only guests are paused';
end $$;

-- 4. Pause all: everyone refused, staff included; resume brings it back.
do $$
declare r record;
begin
  perform set_config('app.user_id', '00000000-0000-0000-0000-000000000001', true);
  assert set_pause('all', true, 'Claude incident'), 'the owner could not pause all';
  select * into r from claim_use('00000000-0000-0000-0000-000000000001');
  assert not r.ok and r.reason = 'paused', 'the owner could summarize while everything is paused';
  assert set_pause('all', false, null), 'resume all failed';
  assert set_pause('guests', false, null), 'resume guests failed';
  select * into r from claim_use('00000000-0000-0000-0000-000000000001');
  assert r.ok, 'still refused after resuming';
  assert create_guest() is not null, 'no guest after resuming';
end $$;
reset role;

-- 5. Every change is audited with who and why.
do $$ begin
  assert (select string_agg(action || ':' || coalesce(reason, '-'), ' | ' order by id) from audit_log) =
    'pause_guests:Guest farming from one network | pause_all:Claude incident | resume_all:- | resume_guests:-',
    'audit log wrong: ' || (select string_agg(action, ',' order by id) from audit_log);
  assert (select guests_paused_by is null and all_paused_at is null from settings), 'resume left state behind';
end $$;

-- 6. The daily cap: today's spend at $3 refuses until tomorrow; refunded spend still counts.
insert into usage_events (user_id, is_guest, cost_usd, recorded, refunded)
values ('00000000-0000-0000-0000-0000000000d1', false, 3.00, true, true);
set role distill_app;
do $$
declare r record;
begin
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000d1', true);
  select * into r from claim_use('00000000-0000-0000-0000-0000000000d1');
  assert not r.ok and r.reason = 'daily_cap' and r.next_free_at = date_trunc('day', now()) + interval '1 day',
    'the daily cap did not stop new uses until tomorrow';
end $$;
reset role;

-- 7. Both caps reached: the month's (longer) is the one told.
update settings set daily_cap_usd = 3, monthly_cap_usd = 3;
set role distill_app;
do $$
declare r record;
begin
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000d1', true);
  select * into r from claim_use('00000000-0000-0000-0000-0000000000d1');
  assert r.reason = 'cap', 'with both caps reached, the month should be told, got ' || r.reason;
end $$;
reset role;
update settings set daily_cap_usd = 3, monthly_cap_usd = 40;

select 'all 005 checks passed' as result;
