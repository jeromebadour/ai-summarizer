-- Distill: migration 007. What the admin console reads, and only that.
--
-- Staff never read user tables directly (row-level security shows each person only their own rows). Each tab has one
-- function here that first checks the acting person's role (the matrix in src/lib/permissions.ts: overview and spend
-- for owner and admin; users and activity for moderators too; roles for the owner alone), then returns one page as
-- JSON. Metadata only: names, counts, lengths, tokens, costs, times. No function here touches source_text, sentences,
-- points or figures: nobody, the owner included, reads what users pasted or got back.
-- Days are cut in the viewer's time zone (p_tz, an IANA name the app has already checked).

-- The usage ledger also keeps each priced summary's length and word count, so Activity can show them without ever
-- reading the summaries table (and they outlive a deleted summary, like the cost).
alter table usage_events add column length summary_length, add column words integer check (words >= 0);
drop function record_cost(bigint, integer, integer, numeric);
create or replace function record_cost(p_use bigint, p_in integer, p_out integer, p_cost numeric, p_length summary_length, p_words integer)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update usage_events set input_tokens = p_in, output_tokens = p_out, cost_usd = p_cost, length = p_length, words = p_words, recorded = true
  where id = p_use and user_id = app_user_id() and not recorded;
  return found;
end $$;

-- The acting person's staff role, or an error. Suspended staff hold nothing.
create or replace function staff_role(p_allowed user_role[]) returns user_role
language plpgsql stable security definer set search_path = public as $$
declare r user_role;
begin
  select role into r from users where id = app_user_id() and suspended_at is null;
  if r is null or not (r = any(p_allowed)) then raise exception 'staff: not allowed'; end if;
  return r;
end $$;

-- A person as the console shows them.
create or replace function person_json(u users) returns jsonb
language sql immutable as $$
  select jsonb_build_object('id', u.id, 'name', u.name, 'username', u.username, 'avatarColour', u.avatar_colour, 'role', u.role)
$$;

-- Overview: counts and the 14-day series (oldest first, today last). Summaries and spend come from the usage ledger,
-- so deleting summaries never changes the console's history.
create or replace function admin_overview(p_tz text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  today date := (now() at time zone p_tz)::date;
  first date := today - 13;
  out jsonb;
begin
  perform staff_role(array['owner', 'admin']::user_role[]);
  with days as (select generate_series(first, today, interval '1 day')::date as d),
  used as (
    select (created_at at time zone p_tz)::date as d, count(*) filter (where recorded and not refunded) as n, sum(cost_usd) as cost
    from usage_events where created_at >= (first::timestamp at time zone p_tz) group by 1
  ),
  joins as (
    select (created_at at time zone p_tz)::date as d, count(*) as n from auth_events
    where kind in ('signup', 'upgrade') and created_at >= (first::timestamp at time zone p_tz) group by 1
  )
  select jsonb_build_object(
    'today', today,
    'registered', (select count(*) from users where role <> 'guest'),
    'guestsActive', (select count(*) from users where role = 'guest' and last_active_at > now() - interval '7 days'),
    'guestsToday', (select count(*) from auth_events where kind = 'guest' and (created_at at time zone p_tz)::date = today),
    'upgradedWeek', (select count(*) from auth_events where kind = 'upgrade' and created_at > now() - interval '7 days'),
    'activeNow', (select count(*) from users where last_active_at > now() - interval '5 minutes'),
    'activeWeek', (select count(*) from users where last_active_at > now() - interval '7 days'),
    'limitsHitUsers', (select count(distinct e.user_id) from request_errors e join users u on u.id = e.user_id
                       where e.code in ('limit_hour', 'limit_day') and u.role <> 'guest' and (e.created_at at time zone p_tz)::date = today),
    'limitsHitGuests', (select count(distinct e.user_id) from request_errors e join users u on u.id = e.user_id
                        where e.code in ('limit_hour', 'limit_guests_day') and u.role = 'guest' and (e.created_at at time zone p_tz)::date = today),
    'signups', (select jsonb_agg(coalesce(j.n, 0) order by days.d) from days left join joins j on j.d = days.d),
    'summaries', (select jsonb_agg(coalesce(u.n, 0) order by days.d) from days left join used u on u.d = days.d),
    'spendCents', (select jsonb_agg(round(coalesce(u.cost, 0) * 100, 4) order by days.d) from days left join used u on u.d = days.d),
    'failedToday', (select count(*) from request_errors where code like 'claude_%' and (created_at at time zone p_tz)::date = today),
    'lastFailure', (select jsonb_build_object('at', created_at, 'code', code) from request_errors where code like 'claude_%' order by created_at desc limit 1),
    'avgSeconds', (select round(avg(seconds), 1) from summaries where (created_at at time zone p_tz)::date = today),
    'p95Seconds', (select round(percentile_cont(0.95) within group (order by seconds)::numeric, 1) from summaries where (created_at at time zone p_tz)::date = today),
    'dbSizeMb', round(pg_database_size(current_database()) / 1048576.0, 1),
    'connections', (select count(*) from pg_stat_activity where datname = current_database()),
    'maxConnections', current_setting('max_connections')::int,
    'largestTable', (select jsonb_build_object('name', relname, 'sizeMb', round(pg_total_relation_size(relid) / 1048576.0, 1))
                     from pg_stat_user_tables order by pg_total_relation_size(relid) desc limit 1),
    'settings', (select jsonb_build_object('capUsd', monthly_cap_usd, 'workspaceCapUsd', workspace_cap_usd, 'dailyCapUsd', daily_cap_usd,
                   'guestsPaused', case when guests_paused_at is null then null else jsonb_build_object('since', guests_paused_at, 'reason', guests_paused_reason,
                     'by', (select person_json(u) from users u where u.id = guests_paused_by)) end,
                   'allPaused', case when all_paused_at is null then null else jsonb_build_object('since', all_paused_at, 'reason', all_paused_reason,
                     'by', (select person_json(u) from users u where u.id = all_paused_by)) end)
                 from settings)
  ) into out;
  return out;
end $$;

-- Users: one page, filtered, with the counts the chips show. Summaries and cost from the ledger.
create or replace function admin_users(p_query text, p_roles user_role[], p_suspended boolean, p_limit int, p_offset int)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  q text := nullif(trim(coalesce(p_query, '')), '');
  pattern text := '%' || replace(replace(replace(coalesce(q, ''), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  -- Spend is for owner and admin: a moderator gets null in its place.
  sees_spend boolean := staff_role(array['owner', 'admin', 'moderator']::user_role[]) in ('owner', 'admin');
  out jsonb;
begin
  with matched as (
    select u.* from users u
    where (q is null or u.name ilike pattern or u.username ilike pattern or u.email ilike pattern)
  ),
  filtered as (
    select * from matched
    where (coalesce(cardinality(p_roles), 0) = 0 or role = any(p_roles)) and (not p_suspended or suspended_at is not null)
  ),
  ledger as (
    select user_id, count(*) filter (where recorded and not refunded) as n, sum(cost_usd) as cost from usage_events group by user_id
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'counts', jsonb_build_object(
      'roles', (select coalesce(jsonb_object_agg(role, n), '{}') from (select role, count(*) as n from matched group by role) r),
      'suspended', (select count(*) from matched where suspended_at is not null)),
    'rows', coalesce((
      select jsonb_agg(row order by f_created desc, f_id desc) from (
        select f.created_at as f_created, f.id as f_id, jsonb_build_object(
          'person', person_json(f), 'email', f.email, 'createdAt', f.created_at, 'lastActiveAt', f.last_active_at,
          'summaries', coalesce(l.n, 0), 'costUsd', case when sees_spend then coalesce(l.cost, 0) end, 'suspended', f.suspended_at is not null) as row
        from filtered f left join ledger l on l.user_id = f.id
        order by f.created_at desc, f.id desc limit p_limit offset p_offset
      ) page), '[]')
  ) into out;
  return out;
end $$;

-- One user as staff see them: metadata, usage, limits, devices, staff actions on them. Never their text.
create or replace function admin_user(p_username text, p_tz text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  u users;
  today date := (now() at time zone p_tz)::date;
  hour_start timestamptz;
  sees_spend boolean := staff_role(array['owner', 'admin', 'moderator']::user_role[]) in ('owner', 'admin');
  out jsonb;
begin
  select * into u from users where username = lower(p_username);
  if not found then return null; end if;
  hour_start := greatest(now() - interval '1 hour', coalesce(u.limit_reset_at, '-infinity'));
  with days as (select generate_series(today - 13, today, interval '1 day')::date as d),
  used as (
    select (created_at at time zone p_tz)::date as d, count(*) as n from usage_events
    where user_id = u.id and recorded and not refunded and created_at >= ((today - 13)::timestamp at time zone p_tz) group by 1
  )
  select jsonb_build_object(
    'person', person_json(u), 'email', u.email, 'createdAt', u.created_at, 'lastActiveAt', u.last_active_at,
    'suspended', u.suspended_at is not null,
    'summaries', (select count(*) from usage_events where user_id = u.id and recorded and not refunded),
    'costUsd', case when sees_spend then (select coalesce(sum(cost_usd), 0) from usage_events where user_id = u.id) end,
    'flagged', (select count(*) from summaries where user_id = u.id and figure_status = 'flagged'),
    'daily', (select jsonb_agg(coalesce(x.n, 0) order by days.d) from days left join used x on x.d = days.d),
    'accountDays', today - (u.created_at at time zone p_tz)::date + 1,
    'hourUsed', (select count(*) from usage_events where user_id = u.id and not refunded and created_at > hour_start),
    'hourLimit', case when u.role = 'guest' then 5 else 10 end,
    'nextFreeAt', (select min(created_at) + interval '1 hour' from usage_events where user_id = u.id and not refunded and created_at > hour_start),
    'dayUsed', (select count(*) from usage_events where user_id = u.id and not refunded and created_at > date_trunc('day', now())),
    'limitResetAt', u.limit_reset_at,
    'sessions', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'browser', s.browser, 'os', s.os, 'place', s.place, 'lastSeenAt', s.last_seen_at)
                           order by s.last_seen_at desc) from sessions s where s.user_id = u.id and s.expires_at > now()), '[]'),
    'staffActions', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'at', a.created_at, 'action', a.action, 'reason', a.reason,
                                'details', a.details, 'actor', (select person_json(x) from users x where x.id = a.actor_id)) order by a.created_at desc)
                              from audit_log a where a.target_user_id = u.id), '[]')
  ) into out;
  return out;
end $$;

-- Activity: one log from the auth events, the usage ledger (summaries, as metadata) and the audit log; one page,
-- filtered by kind, with a count for every kind.
create or replace function admin_activity(p_kinds text[], p_who text, p_limit int, p_offset int) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  sees_spend boolean := staff_role(array['owner', 'admin', 'moderator']::user_role[]) in ('owner', 'admin');
  out jsonb;
begin
  with log as (
    select 'a' || e.id as id, e.created_at as at,
           case e.kind when 'signin_failed' then 'signinFailed' else e.kind end as kind,
           e.user_id, e.detail, e.place, null::jsonb as usage, null::jsonb as audit
    from auth_events e
    union all
    select 'u' || g.id, g.created_at, 'summary', g.user_id, '', '',
           -- Tokens price the summary, so a moderator gets neither: only its length and size.
           jsonb_build_object('length', g.length, 'words', g.words) || case when sees_spend then
             jsonb_build_object('inputTokens', g.input_tokens, 'outputTokens', g.output_tokens, 'costUsd', g.cost_usd) else '{}' end, null
    from usage_events g where g.recorded and not g.refunded
    union all
    -- Staff actions as facts (the app words them): what, on whom, why, and any details (a role, a cap).
    select 'x' || a.id, a.created_at, 'staff', a.actor_id, '', a.place, null,
           jsonb_build_object('action', a.action, 'target', (select username from users t where t.id = a.target_user_id),
             'reason', a.reason, 'details', a.details)
    from audit_log a
  ),
  -- "Search @username": one person's events (the kind counts still cover the whole log, as the chips show).
  who as (select id from users where username = lower(ltrim(trim(coalesce(p_who, '')), '@'))),
  picked as (
    select * from log
    where (coalesce(cardinality(p_kinds), 0) = 0 or kind = any(p_kinds))
      and (nullif(trim(coalesce(p_who, '')), '') is null or user_id = (select id from who))
  )
  select jsonb_build_object(
    'total', (select count(*) from picked),
    'counts', (select coalesce(jsonb_object_agg(kind, n), '{}') from (select kind, count(*) as n from log group by kind) c),
    'rows', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'at', p.at, 'kind', p.kind, 'detail', p.detail, 'place', p.place,
                        'usage', p.usage, 'audit', p.audit, 'person', (select person_json(u) from users u where u.id = p.user_id)) order by p.at desc, p.id desc)
                      from (select * from picked order by at desc, id desc limit p_limit offset p_offset) p), '[]')
  ) into out;
  return out;
end $$;

-- Spend per person from a moment on (this month), most first; one page.
create or replace function admin_spend(p_from timestamptz, p_limit int, p_offset int) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare out jsonb;
begin
  perform staff_role(array['owner', 'admin']::user_role[]);
  with per as (
    select user_id, count(*) filter (where recorded and not refunded) as n, sum(input_tokens) as tin, sum(output_tokens) as tout, sum(cost_usd) as cost
    from usage_events where created_at >= p_from and user_id is not null and recorded group by user_id
  )
  select jsonb_build_object(
    'total', (select count(*) from per),
    'rows', coalesce((select jsonb_agg(jsonb_build_object('person', person_json(u), 'summaries', p.n, 'inputTokens', p.tin,
                        'outputTokens', p.tout, 'costUsd', p.cost) order by p.cost desc, u.id)
                      from (select * from per order by cost desc, user_id limit p_limit offset p_offset) p join users u on u.id = p.user_id), '[]')
  ) into out;
  return out;
end $$;

-- Roles (owner only): who holds a staff role, since when and granted by whom, and every grant and revoke.
create or replace function admin_roles() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare out jsonb;
begin
  perform staff_role(array['owner']::user_role[]);
  select jsonb_build_object(
    'holders', coalesce((select jsonb_agg(jsonb_build_object('person', person_json(u),
                 'since', coalesce((select a.created_at from audit_log a where a.target_user_id = u.id and a.action = 'grant_role'
                                    order by a.created_at desc limit 1), u.created_at),
                 'grantedBy', (select person_json(x) from audit_log a join users x on x.id = a.actor_id where a.target_user_id = u.id
                               and a.action = 'grant_role' order by a.created_at desc limit 1))
               order by array_position(array['owner', 'admin', 'moderator']::user_role[], u.role), u.created_at)
               from users u where u.role in ('owner', 'admin', 'moderator')), '[]'),
    'changes', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'at', a.created_at, 'action', a.action, 'role', a.details->>'role',
                 'reason', a.reason, 'actor', (select person_json(x) from users x where x.id = a.actor_id),
                 'target', (select person_json(t) from users t where t.id = a.target_user_id)) order by a.created_at desc)
               from audit_log a where a.action in ('grant_role', 'revoke_role')), '[]')
  ) into out;
  return out;
end $$;

-- The app may log a refused use (the reason only) so the console can count limits reached.
revoke execute on all functions in schema public from public;
grant execute on function app_user_id(), claim_use(uuid), give_back(bigint), record_cost(bigint, integer, integer, numeric, summary_length, integer),
  find_account(text), session_owner(bytea), username_taken(text), email_taken(text), create_guest(),
  upgrade_guest(text, text, text, text), recent_failures(uuid), quota_now(uuid), set_pause(text, boolean, text), app_state(),
  admin_overview(text), admin_users(text, user_role[], boolean, int, int), admin_user(text, text),
  admin_activity(text[], text, int, int), admin_spend(timestamptz, int, int), admin_roles() to distill_app;
