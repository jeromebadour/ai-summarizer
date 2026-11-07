-- Distill: migration 008. What staff can do, and only that.
--
-- One function per action. Each checks the acting person's role against the matrix in src/lib/permissions.ts, takes a
-- reason (3 to 200 characters), changes what it says, and writes one row to the append-only audit log in the same
-- transaction: an action that isn't logged doesn't happen. A function returns false when there was nothing to change
-- (already suspended, the same role); then nothing is logged.
--
-- Who can act on whom: only on someone of a lower role (owner > admin > moderator > user and guest), never on
-- yourself. So a moderator acts on users and guests, an admin on moderators too, and nobody on the owner.

create or replace function role_rank(r user_role) returns int
language sql immutable as $$
  select case r when 'owner' then 4 when 'admin' then 3 when 'moderator' then 2 else 1 end
$$;

-- The reason as stored: trimmed, 3 to 200 characters, or an error.
create or replace function staff_reason(p_reason text) returns text
language plpgsql immutable as $$
declare r text := trim(coalesce(p_reason, ''));
begin
  if length(r) < 3 then raise exception 'staff: a reason is required'; end if;
  if length(r) > 200 then raise exception 'staff: the reason is too long'; end if;
  return r;
end $$;

-- The account an action is about, checked against the acting person: it exists, it isn't them, it ranks below them.
create or replace function staff_target(p_username text, p_allowed user_role[]) returns users
language plpgsql stable security definer set search_path = public as $$
declare
  actor_role user_role := staff_role(p_allowed);
  t users;
begin
  select * into t from users where username = lower(trim(coalesce(p_username, '')));
  if not found then raise exception 'staff: no such account'; end if;
  if t.id = app_user_id() then raise exception 'staff: not on yourself'; end if;
  if role_rank(t.role) >= role_rank(actor_role) then raise exception 'staff: not above your role'; end if;
  return t;
end $$;

-- Suspend: signed out at once, and refused at sign-in and by claim_use until restored. Nothing is deleted.
create or replace function staff_suspend(p_username text, p_reason text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  t users := staff_target(p_username, array['owner', 'admin', 'moderator']::user_role[]);
  r text := staff_reason(p_reason);
  devices int;
begin
  if t.suspended_at is not null then return false; end if;
  update users set suspended_at = now(), suspended_reason = r where id = t.id;
  delete from sessions where user_id = t.id;
  get diagnostics devices = row_count;
  insert into audit_log (actor_id, action, target_user_id, reason, details)
  values (app_user_id(), 'suspend', t.id, r, jsonb_build_object('devices', devices));
  return true;
end $$;

create or replace function staff_restore(p_username text, p_reason text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  t users := staff_target(p_username, array['owner', 'admin', 'moderator']::user_role[]);
  r text := staff_reason(p_reason);
begin
  if t.suspended_at is null then return false; end if;
  update users set suspended_at = null, suspended_reason = null where id = t.id;
  insert into audit_log (actor_id, action, target_user_id, reason) values (app_user_id(), 'restore', t.id, r);
  return true;
end $$;

-- Sign out everywhere: every session goes; the account stays active.
create or replace function staff_sign_out_all(p_username text, p_reason text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  t users := staff_target(p_username, array['owner', 'admin', 'moderator']::user_role[]);
  r text := staff_reason(p_reason);
  devices int;
begin
  delete from sessions where user_id = t.id;
  get diagnostics devices = row_count;
  if devices = 0 then return false; end if;
  insert into audit_log (actor_id, action, target_user_id, reason, details)
  values (app_user_id(), 'sign_out_all', t.id, r, jsonb_build_object('devices', devices));
  return true;
end $$;

-- Reset limit: the rolling hour starts again now (quota_now and claim_use read limit_reset_at). The day still counts.
create or replace function staff_reset_limit(p_username text, p_reason text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  t users := staff_target(p_username, array['owner', 'admin']::user_role[]);
  r text := staff_reason(p_reason);
  used int;
begin
  select count(*) into used from usage_events
  where user_id = t.id and not refunded
    and created_at > greatest(now() - interval '1 hour', coalesce(t.limit_reset_at, '-infinity'));
  if used = 0 then return false; end if;
  update users set limit_reset_at = now() where id = t.id;
  insert into audit_log (actor_id, action, target_user_id, reason, details)
  values (app_user_id(), 'reset_limit', t.id, r, jsonb_build_object('used', used));
  return true;
end $$;

-- Roles (owner only): an account becomes Admin, Moderator or User. Guests can't hold a role (no email, no password).
-- The audit action says what happened: grant_role (from User), revoke_role (back to User), change_role (staff to staff).
-- It takes effect on their next page: every staff page reads the role again.
create or replace function staff_set_role(p_username text, p_role user_role, p_reason text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  t users := staff_target(p_username, array['owner']::user_role[]);
  r text := staff_reason(p_reason);
begin
  if p_role not in ('admin', 'moderator', 'user') then raise exception 'staff: not a role you can give'; end if;
  if t.role = 'guest' then raise exception 'staff: guests cannot hold a role'; end if;
  if t.suspended_at is not null and p_role <> 'user' then raise exception 'staff: restore them first'; end if;
  if t.role = p_role then return false; end if;
  update users set role = p_role where id = t.id;
  insert into audit_log (actor_id, action, target_user_id, reason, details)
  values (app_user_id(),
          case when t.role = 'user' then 'grant_role' when p_role = 'user' then 'revoke_role' else 'change_role' end,
          t.id, r,
          case when t.role = 'user' then jsonb_build_object('role', p_role)
               when p_role = 'user' then jsonb_build_object('role', t.role)
               else jsonb_build_object('role', p_role, 'from', t.role) end);
  return true;
end $$;

-- Caps (owner only). The monthly cap sits between what this month has already spent and the Anthropic workspace
-- limit; the daily cap between what today has spent and the monthly cap. (To stop at once, pull a brake instead.)
create or replace function staff_set_caps(p_monthly numeric, p_daily numeric, p_reason text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  s settings;
  r text;
  month_spend numeric;
  day_spend numeric;
begin
  perform staff_role(array['owner']::user_role[]);
  r := staff_reason(p_reason);
  select * into s from settings for update;
  select coalesce(sum(cost_usd), 0) into month_spend from usage_events where created_at >= date_trunc('month', now());
  select coalesce(sum(cost_usd), 0) into day_spend from usage_events where created_at >= date_trunc('day', now());
  if p_monthly is null or p_monthly <> round(p_monthly, 2) or p_monthly < month_spend or p_monthly > s.workspace_cap_usd then
    raise exception 'staff: monthly cap out of range';
  end if;
  if p_daily is null or p_daily <> round(p_daily, 2) or p_daily <= 0 or p_daily < day_spend or p_daily > p_monthly then
    raise exception 'staff: daily cap out of range';
  end if;
  if p_monthly = s.monthly_cap_usd and p_daily = s.daily_cap_usd then return false; end if;
  update settings set monthly_cap_usd = p_monthly, daily_cap_usd = p_daily;
  insert into audit_log (actor_id, action, reason, details)
  values (app_user_id(), 'change_caps', r, jsonb_build_object('monthly', p_monthly, 'daily', p_daily,
          'fromMonthly', s.monthly_cap_usd, 'fromDaily', s.daily_cap_usd));
  return true;
end $$;

-- The brakes now take a reason both ways (every staff action asks for one): set_pause from 005, same checks.
create or replace function set_pause(p_kind text, p_on boolean, p_reason text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  actor uuid := app_user_id();
  r text;
begin
  perform staff_role(array['owner', 'admin']::user_role[]);
  if p_kind not in ('guests', 'all') then raise exception 'set_pause: unknown kind %', p_kind; end if;
  r := staff_reason(p_reason);
  if p_kind = 'guests' then
    update settings set guests_paused_at = case when p_on then now() end,
                        guests_paused_by = case when p_on then actor end,
                        guests_paused_reason = case when p_on then r end
    where (guests_paused_at is not null) <> p_on;
  else
    update settings set all_paused_at = case when p_on then now() end,
                        all_paused_by = case when p_on then actor end,
                        all_paused_reason = case when p_on then r end
    where (all_paused_at is not null) <> p_on;
  end if;
  if not found then return false; end if;
  insert into audit_log (actor_id, action, reason) values (actor, case when p_on then 'pause_' else 'resume_' end || p_kind, r);
  return true;
end $$;

-- The Grant role dialog's lookup (owner only): one account by @username or email, as the console shows a person.
create or replace function staff_find_account(p_query text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  q text := lower(trim(both '@ ' from coalesce(p_query, '')));
  u users;
begin
  perform staff_role(array['owner']::user_role[]);
  if q = '' then return null; end if;
  select * into u from users where (username = q or email = q) and role <> 'guest';
  if not found then return null; end if;
  return person_json(u) || jsonb_build_object('suspended', u.suspended_at is not null);
end $$;

-- Roles tab (from 007): a change between staff roles counts as well. A holder's "since" and "by" come from the latest
-- grant or change. The history is a preview, the latest 5 grants, changes and revokes; Activity holds them all, paged.
create or replace function admin_roles() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare out jsonb;
begin
  perform staff_role(array['owner']::user_role[]);
  select jsonb_build_object(
    'holders', coalesce((select jsonb_agg(jsonb_build_object('person', person_json(u),
                 'since', coalesce(g.created_at, u.created_at),
                 'grantedBy', (select person_json(x) from users x where x.id = g.actor_id))
               order by array_position(array['owner', 'admin', 'moderator']::user_role[], u.role), u.created_at)
               from users u
               left join lateral (select a.created_at, a.actor_id from audit_log a where a.target_user_id = u.id
                                  and a.action in ('grant_role', 'change_role') order by a.created_at desc, a.id desc limit 1) g on true
               where u.role in ('owner', 'admin', 'moderator')), '[]'),
    'changes', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'at', a.created_at, 'action', a.action, 'role', a.details->>'role',
                 'reason', a.reason, 'actor', (select person_json(x) from users x where x.id = a.actor_id),
                 'target', (select person_json(t) from users t where t.id = a.target_user_id)) order by a.created_at desc, a.id desc)
               from (select * from audit_log where action in ('grant_role', 'change_role', 'revoke_role')
                     order by created_at desc, id desc limit 5) a), '[]')
  ) into out;
  return out;
end $$;

revoke execute on all functions in schema public from public;
grant execute on function staff_suspend(text, text), staff_restore(text, text), staff_sign_out_all(text, text),
  staff_reset_limit(text, text), staff_set_role(text, user_role, text), staff_set_caps(numeric, numeric, text),
  set_pause(text, boolean, text), staff_find_account(text), admin_roles() to distill_app;
