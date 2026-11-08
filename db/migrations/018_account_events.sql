-- Distill: migration 018. Two more account events reach the console's Activity: an email confirmed (a new account's
-- first address, or a changed one) and a password set again from Forgot password. Both are written where they
-- happen, in the database, so no path through the app can skip them. The detail is a fact, never the address.
alter table auth_events drop constraint auth_events_kind_check;
alter table auth_events add constraint auth_events_kind_check
  check (kind in ('signup', 'guest', 'signin', 'signin_failed', 'upgrade', 'delete', 'email_confirmed', 'password_reset'));

create or replace function apply_verify(t email_tokens) returns text
language plpgsql security definer set search_path = public as $$
declare changed boolean;
begin
  if exists (select 1 from users where email = t.email and id <> t.user_id) then
    update email_tokens set used_at = now() where id = t.id;
    return 'taken';
  end if;
  update email_tokens set used_at = now() where id = t.id;
  select email is distinct from t.email into changed from users where id = t.user_id;
  update users set email = t.email, email_verified_at = now(),
                   pending_email = case when pending_email = t.email then null else pending_email end
  where id = t.user_id;
  insert into auth_events (user_id, kind, detail) values (t.user_id, 'email_confirmed', case when changed then 'changed' else '' end);
  return 'ok';
end $$;

create or replace function reset_by_link(p_link_hash bytea, p_password_hash text) returns uuid
language plpgsql security definer set search_path = public as $$
declare t email_tokens;
begin
  select * into t from email_tokens where link_hash = p_link_hash and purpose = 'reset' for update;
  if t.id is null or not token_live(t) then return null; end if;
  update email_tokens set used_at = now() where id = t.id;
  update users set password_hash = p_password_hash, password_changed_at = now(),
                   email_verified_at = coalesce(email_verified_at, now())
  where id = t.user_id;
  delete from sessions where user_id = t.user_id;
  insert into auth_events (user_id, kind) values (t.user_id, 'password_reset');
  return t.user_id;
end $$;

create or replace function admin_activity(p_kinds text[], p_who text, p_limit int, p_offset int) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  sees_spend boolean := staff_role(array['owner', 'admin', 'moderator']::user_role[]) in ('owner', 'admin');
  out jsonb;
begin
  with log as (
    select 'a' || e.id as id, e.created_at as at,
           case e.kind when 'signin_failed' then 'signinFailed' when 'email_confirmed' then 'emailConfirmed'
                         when 'password_reset' then 'passwordReset' else e.kind end as kind,
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
