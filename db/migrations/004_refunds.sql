-- Distill: migration 004. A failed request gives the use back without hiding what it cost.
--
-- One usage row is both a use of the limit and the spend ledger. Until now give_back deleted the row, and refused once
-- the row was priced, so a summary Claude was paid for but that the app couldn't use (an answer that fails the
-- checks) either cost the user a use or, if deleted, vanished from the spend. Now give_back marks the row refunded:
-- the limits stop counting it, the spend still counts it, and the console can see failed attempts.

alter table usage_events add column refunded boolean not null default false;

create or replace function give_back(p_use bigint) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update usage_events set refunded = true
  where id = p_use and user_id = app_user_id() and not refunded and created_at > now() - interval '10 minutes';
  return found;
end $$;

-- quota_now: the same as 003, counting only uses that weren't given back.
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
  select count(*), min(created_at) into n_hour, oldest
  from usage_events where user_id = p_user and not refunded and created_at > hour_start;
  is_guest := u.role = 'guest';
  used_hour := n_hour;
  limit_hour := case when is_guest then 5 else 10 end;
  next_free_at := oldest + interval '1 hour';
  suspended := u.suspended_at is not null;
  if is_guest then
    select count(*) into used_day from usage_events
    where usage_events.is_guest and not refunded and created_at > date_trunc('day', now());
    limit_day := 50;
  else
    select count(*) into used_day from usage_events
    where user_id = p_user and not refunded and created_at > date_trunc('day', now());
    limit_day := 30;
  end if;
  return next;
end $$;

revoke execute on all functions in schema public from public;
grant execute on function app_user_id(), claim_use(uuid), give_back(bigint), record_cost(bigint, integer, integer, numeric),
  find_account(text), session_owner(bytea), username_taken(text), email_taken(text), create_guest(),
  upgrade_guest(text, text, text, text), recent_failures(uuid), quota_now(uuid) to distill_app;
