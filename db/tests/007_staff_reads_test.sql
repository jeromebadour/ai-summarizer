-- Proves migration 007. Self-contained; run after all migrations.
\set ON_ERROR_STOP on

delete from usage_events;
delete from audit_log;
delete from auth_events;
delete from request_errors;
delete from summaries;
delete from sessions;
update users set role = 'user' where role = 'owner';
delete from users;
insert into users (id, name, username, email, password_hash, role) values
  ('00000000-0000-0000-0000-0000000000f1', 'Jerome Badour', 'jerome', 'jerome@example.com', 'x', 'owner'),
  ('00000000-0000-0000-0000-0000000000f2', 'Hana Mori', 'hana_m', 'hana@example.com', 'x', 'admin'),
  ('00000000-0000-0000-0000-0000000000f3', 'Lena Schmidt', 'lena_s', 'lena@example.com', 'x', 'moderator'),
  ('00000000-0000-0000-0000-0000000000f4', 'Kevin Novak', 'kevin_n', 'kevin@example.com', 'x', 'user');
insert into users (id, name, username, role) values ('00000000-0000-0000-0000-0000000000f5', 'Guest 9', 'guest-9', 'guest');
-- Kevin's summary carries a secret in every text column; no staff read may ever return it.
insert into summaries (user_id, title, source_text, sentences, points, figures, figure_status, length, model, input_tokens,
  output_tokens, cost_usd, seconds, words_in, words_out)
values ('00000000-0000-0000-0000-0000000000f4', 'Kevin title', 'SECRET-SOURCE', '[{"id":1,"text":"SECRET-SENTENCE","paragraph":1}]',
  '[{"id":1,"text":"SECRET-POINT","sourceIds":[1]}]', '[{"id":1,"value":"SECRET-FIGURE","label":"x","sourceIds":[1]}]', 'flagged',
  'medium', 'claude-haiku-5-5', 1200, 180, 0.0002, 2, 900, 110);
insert into usage_events (user_id, is_guest, input_tokens, output_tokens, cost_usd, recorded, length, words) values
  ('00000000-0000-0000-0000-0000000000f4', false, 1200, 180, 0.0002, true, 'medium', 900),
  ('00000000-0000-0000-0000-0000000000f4', false, 900, 120, 0.0002, true, 'short', 700),
  ('00000000-0000-0000-0000-0000000000f5', true, 500, 90, 0.0001, true, 'bullets', 300);
insert into auth_events (user_id, kind) values ('00000000-0000-0000-0000-0000000000f4', 'signup'), ('00000000-0000-0000-0000-0000000000f5', 'guest');
insert into request_errors (request_id, user_id, code) values ('req_a', '00000000-0000-0000-0000-0000000000f4', 'limit_hour');
insert into audit_log (actor_id, action, target_user_id, reason, details) values
  ('00000000-0000-0000-0000-0000000000f1', 'grant_role', '00000000-0000-0000-0000-0000000000f2', 'Runs support', '{"role":"admin"}');

set role distill_app;

-- 1. The matrix: a user reads nothing; a moderator reads users and activity only; an admin all but roles.
do $$
declare
  forbidden text[][] := array[
    ['00000000-0000-0000-0000-0000000000f4', 'select admin_users(null, null, false, 15, 0)'],
    ['00000000-0000-0000-0000-0000000000f4', 'select admin_activity(null, null, 15, 0)'],
    ['00000000-0000-0000-0000-0000000000f3', 'select admin_overview(''UTC'')'],
    ['00000000-0000-0000-0000-0000000000f3', 'select admin_spend(now() - interval ''1 day'', 15, 0)'],
    ['00000000-0000-0000-0000-0000000000f3', 'select admin_roles()'],
    ['00000000-0000-0000-0000-0000000000f2', 'select admin_roles()']];
  i int;
begin
  for i in 1..array_length(forbidden, 1) loop
    perform set_config('app.user_id', forbidden[i][1], true);
    begin
      execute forbidden[i][2];
      raise exception 'allowed: %', forbidden[i][2];
    exception when raise_exception then
      if sqlerrm like 'allowed:%' then raise; end if;
    end;
  end loop;
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000f3', true);
  perform admin_users(null, null, false, 15, 0);
  perform admin_activity(null, null, 15, 0);
  perform admin_user('kevin_n', 'UTC');
end $$;

-- 2. Nothing a user wrote ever comes back, from any staff read.
do $$
declare everything text;
begin
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000f1', true);
  everything := admin_overview('Europe/Istanbul')::text || admin_users(null, null, false, 100, 0)::text
    || admin_user('kevin_n', 'UTC')::text || admin_activity(null, null, 100, 0)::text
    || admin_spend(now() - interval '1 day', 100, 0)::text || admin_roles()::text;
  assert everything not like '%SECRET%', 'a staff read returned user text';
end $$;

-- 3. Numbers come from the ledger and agree.
do $$
declare o jsonb; u jsonb; a jsonb; s jsonb;
begin
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000f2', true);
  o := admin_overview('UTC');
  assert (o->>'registered')::int = 4 and (o->'summaries'->>13)::int = 3, 'overview counts wrong: ' || o::text;
  assert (o->'spendCents'->>13)::numeric = 0.05, 'today spend wrong';
  assert (o->>'limitsHitUsers')::int = 1, 'limits reached not counted';
  u := admin_users('kev', null, false, 15, 0);
  assert (u->>'total')::int = 1 and (u->'rows'->0->>'summaries')::int = 2, 'user search or counts wrong';
  u := admin_users(null, array['guest']::user_role[], false, 15, 0);
  assert (u->>'total')::int = 1 and (u->'counts'->'roles'->>'user')::int = 1, 'role filter or counts wrong';
  u := admin_users('100%', null, false, 15, 0);
  assert (u->>'total')::int = 0, '% in a search acted as a wildcard';
  u := admin_user('kevin_n', 'UTC');
  assert (u->>'flagged')::int = 1 and (u->'daily'->>13)::int = 2 and (u->>'hourUsed')::int = 2, 'user detail wrong: ' || u::text;
  a := admin_activity(array['summary'], null, 15, 0);
  assert (a->>'total')::int = 3 and a->'rows'->0->'usage'->>'length' is not null, 'activity summaries wrong';
  assert (a->'counts'->>'signup')::int = 1 and (a->'counts'->>'staff')::int = 1, 'activity counts wrong';
  a := admin_activity(null, null, 2, 2);
  assert jsonb_array_length(a->'rows') = 2 and (a->>'total')::int = 6, 'activity paging wrong';
  a := admin_activity(null, '@Kevin_N', 15, 0);
  assert (a->>'total')::int = 3, 'activity by username wrong: ' || (a->>'total');
  a := admin_activity(null, 'nobody_here', 15, 0);
  assert (a->>'total')::int = 0, 'an unknown username matched events';
  s := admin_spend(now() - interval '1 day', 15, 0);
  assert (s->>'total')::int = 2 and s->'rows'->0->'person'->>'username' = 'kevin_n', 'spend order wrong';
end $$;

-- 4. Deleting summaries changes no console number (the ledger keeps them).
reset role;
delete from summaries;
set role distill_app;
do $$ begin
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000f1', true);
  assert (admin_overview('UTC')->'summaries'->>13)::int = 3, 'deleting summaries changed the console';
  assert (admin_roles()->'holders'->1->'grantedBy'->>'username') = 'jerome', 'role grant not shown';
end $$;

-- 5. A suspended staff member reads nothing.
reset role;
update users set suspended_at = now() where username = 'hana_m';
set role distill_app;
do $$ begin
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000f2', true);
  begin
    perform admin_overview('UTC');
    raise exception 'a suspended admin read the overview';
  exception when raise_exception then
    if sqlerrm = 'a suspended admin read the overview' then raise; end if;
  end;
end $$;
reset role;

select 'all 007 checks passed' as result;

-- 6. Spend is for owner and admin: a moderator's reads carry null where the cost would be.
set role distill_app;
do $$
declare r jsonb;
begin
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000f3', true);
  r := admin_users('kevin', null, false, 15, 0);
  assert r->'rows'->0->'costUsd' = 'null'::jsonb, 'moderator saw a cost in Users: ' || r::text;
  assert admin_user('kevin_n', 'UTC')->'costUsd' = 'null'::jsonb, 'moderator saw a cost on a user page';
  assert admin_activity(array['summary'], null, 15, 0)::text not like '%Tokens%'
     and admin_activity(array['summary'], null, 15, 0)::text not like '%costUsd%', 'moderator saw tokens or cost in Activity';
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000f1', true);
  assert (admin_user('kevin_n', 'UTC')->>'costUsd')::numeric = 0.0004, 'the owner lost the cost';
  assert admin_activity(array['summary'], null, 15, 0)::text like '%costUsd%', 'the owner lost the cost in Activity';
end $$;
reset role;
