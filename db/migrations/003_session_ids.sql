-- Distill: migration 003. A public id for each session.
--
-- The Security tab lists devices and signs one out by clicking it, so the page needs a way to name a session. The
-- token hash is the session's key and stays on the server; this plain number is what the page sees. Row-level
-- security already limits every read and delete to the acting user's own sessions.

alter table sessions add column id bigint generated always as identity;
alter table sessions add constraint sessions_id_key unique (id);

-- ---------------------------------------------------------------------------------------------------------------
-- One place counts the limits. The quota ring on every screen and the check that refuses a use both read
-- quota_now(), so what the ring shows is exactly what the check will do.

create or replace function quota_now(p_user uuid)
returns table (is_guest boolean, used_hour integer, limit_hour integer, next_free_at timestamptz,
               used_day integer, limit_day integer, suspended boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  u          users%rowtype;
  hour_start timestamptz;
  oldest     timestamptz;
  n_hour     integer;
begin
  if p_user is distinct from app_user_id() then
    raise exception 'quota_now: not the acting user';
  end if;
  select * into u from users where id = p_user;
  if not found then raise exception 'quota_now: no such user'; end if;
  hour_start := greatest(now() - interval '1 hour', coalesce(u.limit_reset_at, '-infinity'));
  select count(*), min(created_at) into n_hour, oldest from usage_events where user_id = p_user and created_at > hour_start;
  is_guest := u.role = 'guest';
  used_hour := n_hour;
  limit_hour := case when is_guest then 5 else 10 end;
  next_free_at := oldest + interval '1 hour';
  suspended := u.suspended_at is not null;
  if is_guest then
    -- Guests share one daily pool.
    select count(*) into used_day from usage_events where usage_events.is_guest and created_at > date_trunc('day', now());
    limit_day := 50;
  else
    select count(*) into used_day from usage_events where user_id = p_user and created_at > date_trunc('day', now());
    limit_day := 30;
  end if;
  return next;
end $$;

create or replace function claim_use(p_user uuid)
returns table (ok boolean, reason text, use_id bigint, used_hour integer, limit_hour integer, next_free_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  q           record;
  month_spend numeric;
  cap         numeric;
  new_id      bigint;
begin
  if p_user is distinct from app_user_id() then
    raise exception 'claim_use: not the acting user';
  end if;
  -- Lock the user's row so two tabs can't both take the last use; guests also lock the shared pool.
  perform 1 from users where id = p_user for update;
  if not found then raise exception 'claim_use: no such user'; end if;
  if (select role from users where id = p_user) = 'guest' then perform 1 from settings for update; end if;

  select * into q from quota_now(p_user);
  if q.suspended then
    return query select false, 'suspended', null::bigint, 0, 0, null::timestamptz; return;
  end if;
  if q.used_hour >= q.limit_hour then
    return query select false, 'hour', null::bigint, q.used_hour, q.limit_hour, q.next_free_at; return;
  end if;
  if q.used_day >= q.limit_day then
    return query select false, case when q.is_guest then 'guests_day' else 'day' end, null::bigint, q.used_hour,
      q.limit_hour, null::timestamptz; return;
  end if;

  select monthly_cap_usd into cap from settings;
  select coalesce(sum(cost_usd), 0) into month_spend from usage_events where created_at >= date_trunc('month', now());
  if month_spend >= cap then
    return query select false, 'cap', null::bigint, q.used_hour, q.limit_hour, null::timestamptz; return;
  end if;

  insert into usage_events (user_id, is_guest) values (p_user, q.is_guest) returning id into new_id;
  update users set last_active_at = now() where id = p_user;
  return query select true, null::text, new_id, q.used_hour + 1, q.limit_hour,
    coalesce(q.next_free_at, now() + interval '1 hour');
end $$;

revoke execute on function quota_now(uuid) from public;
grant execute on function quota_now(uuid) to distill_app;
