-- Distill: migration 005. The budget Kami set in Anthropic's console, a daily cap, and two pause switches.
--
-- Anthropic side (2026-11-07): organization limit $95 (shared with W3Arena translation), Distill workspace $50.
-- App side: $40 a month and $3 a day, so a bad day can't eat the month; Distill stops calmly before the wall.
-- Pauses: "guests" (no new guest sessions, guests refused; accounts keep working) and "all" (every summary
-- refused). Owners and admins pull them, with a reason, through set_pause(); every change is in the audit log.

alter table settings
  add column daily_cap_usd        numeric(8, 2) not null default 3.00 check (daily_cap_usd > 0),
  add column guests_paused_at     timestamptz,
  add column guests_paused_by     uuid references users(id) on delete set null,
  add column guests_paused_reason text,
  add column all_paused_at        timestamptz,
  add column all_paused_by        uuid references users(id) on delete set null,
  add column all_paused_reason    text;
alter table settings add constraint settings_daily_under_month check (daily_cap_usd <= monthly_cap_usd);

-- The new budget, only where the old defaults still stand (an owner's own choice is never overwritten).
update settings set monthly_cap_usd = 40.00, workspace_cap_usd = 50.00
where monthly_cap_usd = 8.00 and workspace_cap_usd = 10.00;
alter table settings alter column monthly_cap_usd set default 40.00, alter column workspace_cap_usd set default 50.00;

-- claim_use: as in 003, plus the pauses and the daily cap. Reasons: 'suspended', 'paused', 'guests_paused',
-- 'hour', 'day', 'guests_day', 'daily_cap', 'cap'.
create or replace function claim_use(p_user uuid)
returns table (ok boolean, reason text, use_id bigint, used_hour integer, limit_hour integer, next_free_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  q           record;
  s           settings%rowtype;
  month_spend numeric;
  day_spend   numeric;
  new_id      bigint;
begin
  if p_user is distinct from app_user_id() then
    raise exception 'claim_use: not the acting user';
  end if;
  perform 1 from users where id = p_user for update;
  if not found then raise exception 'claim_use: no such user'; end if;
  if (select role from users where id = p_user) = 'guest' then perform 1 from settings for update; end if;

  select * into q from quota_now(p_user);
  select * into s from settings;
  if q.suspended then
    return query select false, 'suspended', null::bigint, 0, 0, null::timestamptz; return;
  end if;
  if s.all_paused_at is not null then
    return query select false, 'paused', null::bigint, q.used_hour, q.limit_hour, null::timestamptz; return;
  end if;
  if q.is_guest and s.guests_paused_at is not null then
    return query select false, 'guests_paused', null::bigint, q.used_hour, q.limit_hour, null::timestamptz; return;
  end if;
  if q.used_hour >= q.limit_hour then
    return query select false, 'hour', null::bigint, q.used_hour, q.limit_hour, q.next_free_at; return;
  end if;
  if q.used_day >= q.limit_day then
    return query select false, case when q.is_guest then 'guests_day' else 'day' end, null::bigint, q.used_hour,
      q.limit_hour, null::timestamptz; return;
  end if;

  -- Spend counts every priced use, refunded or not: Claude was paid either way. The month comes first: when both
  -- caps are reached, the one that lasts longer is the one to tell.
  select coalesce(sum(cost_usd), 0) into month_spend from usage_events where created_at >= date_trunc('month', now());
  if month_spend >= s.monthly_cap_usd then
    return query select false, 'cap', null::bigint, q.used_hour, q.limit_hour, null::timestamptz; return;
  end if;
  select coalesce(sum(cost_usd), 0) into day_spend from usage_events where created_at >= date_trunc('day', now());
  if day_spend >= s.daily_cap_usd then
    return query select false, 'daily_cap', null::bigint, q.used_hour, q.limit_hour, date_trunc('day', now()) + interval '1 day';
    return;
  end if;

  insert into usage_events (user_id, is_guest) values (p_user, q.is_guest) returning id into new_id;
  update users set last_active_at = now() where id = p_user;
  return query select true, null::text, new_id, q.used_hour + 1, q.limit_hour,
    coalesce(q.next_free_at, now() + interval '1 hour');
end $$;

-- No new guests while guests are paused (or everything is): returns null instead of a user.
create or replace function create_guest() returns uuid
language plpgsql security definer set search_path = public as $$
declare
  n bigint;
  new_id uuid;
begin
  if exists (select 1 from settings where guests_paused_at is not null or all_paused_at is not null) then
    return null;
  end if;
  n := nextval('guest_number');
  insert into users (name, username, role) values ('Guest ' || n, 'guest-' || n, 'guest') returning id into new_id;
  return new_id;
end $$;

-- The two switches. Only an owner or admin, acting as themselves, with a reason to pause. Changing nothing (pausing
-- what is already paused) returns false and logs nothing.
create or replace function set_pause(p_kind text, p_on boolean, p_reason text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  actor      uuid := app_user_id();
  actor_role user_role;
  changed    boolean;
begin
  select role into actor_role from users where id = actor and suspended_at is null;
  if actor_role is null or actor_role not in ('owner', 'admin') then
    raise exception 'set_pause: not allowed';
  end if;
  if p_kind not in ('guests', 'all') then raise exception 'set_pause: unknown kind %', p_kind; end if;
  if p_on and length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'set_pause: a reason is required'; end if;

  if p_kind = 'guests' then
    update settings set guests_paused_at = case when p_on then now() end,
                        guests_paused_by = case when p_on then actor end,
                        guests_paused_reason = case when p_on then trim(p_reason) end
    where (guests_paused_at is not null) <> p_on;
  else
    update settings set all_paused_at = case when p_on then now() end,
                        all_paused_by = case when p_on then actor end,
                        all_paused_reason = case when p_on then trim(p_reason) end
    where (all_paused_at is not null) <> p_on;
  end if;
  changed := found;
  if changed then
    insert into audit_log (actor_id, action, reason)
    values (actor, case when p_on then 'pause_' else 'resume_' end || p_kind, nullif(trim(coalesce(p_reason, '')), ''));
  end if;
  return changed;
end $$;

revoke execute on all functions in schema public from public;
grant execute on function app_user_id(), claim_use(uuid), give_back(bigint), record_cost(bigint, integer, integer, numeric),
  find_account(text), session_owner(bytea), username_taken(text), email_taken(text), create_guest(),
  upgrade_guest(text, text, text, text), recent_failures(uuid), quota_now(uuid), set_pause(text, boolean, text) to distill_app;
