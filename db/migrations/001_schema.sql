-- Distill: the whole schema, first version.
--
-- Run as the database owner (the migration role). The app connects as `distill_app`, which owns nothing, can't bypass
-- row-level security, and only gets the grants at the bottom of this file. Every request sets who it is acting for:
--   select set_config('app.user_id', '<uuid>', true);   -- the signed-in user (or guest), for this transaction only
-- and every user-facing table checks that in its policies, so a missing WHERE can never leak another user's rows.
-- Staff screens never read user tables directly: they read the metadata-only views at the end (no text, ever).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------------------------------------------
-- Who is acting

create or replace function app_user_id() returns uuid
language sql stable as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Users and sessions

create type user_role as enum ('owner', 'admin', 'moderator', 'user', 'guest');
create type summary_length as enum ('short', 'medium', 'bullets');
create type figure_status as enum ('checked', 'flagged', 'none');
create type theme_choice as enum ('system', 'light', 'dark');
create type motion_choice as enum ('system', 'full', 'reduced');

create table users (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null check (length(name) between 1 and 60),
  -- Stored lowercase; 3 to 20 letters, numbers and _ (the same rule as src/lib/username.ts). Guests: guest-<n>.
  username            text not null unique check (username ~ '^([a-z0-9_]{3,20}|guest-[0-9]+)$'),
  email               text unique check (email is null or (email = lower(email) and email like '%_@_%')),
  password_hash       text,
  avatar_colour       text not null default 'indigo'
                      check (avatar_colour in ('indigo', 'teal', 'sage', 'sand', 'plum', 'rose', 'steel')),
  default_length      summary_length not null default 'medium',
  theme               theme_choice not null default 'system',
  motion              motion_choice not null default 'system',
  role                user_role not null default 'user',
  suspended_at        timestamptz,
  suspended_reason    text,
  -- A staff "Reset limit" starts the hour again from this moment.
  limit_reset_at      timestamptz,
  last_active_at      timestamptz not null default now(),
  password_changed_at timestamptz,
  created_at          timestamptz not null default now(),
  -- Accounts have an email and a password; guests have neither.
  check ((role = 'guest') = (email is null and password_hash is null))
);
-- Exactly one owner.
create unique index users_one_owner on users ((true)) where role = 'owner';
create index users_created on users (created_at desc, id desc);

create table sessions (
  -- The cookie holds a random token; only its SHA-256 is stored, so a database leak can't sign anyone in.
  token_hash   bytea primary key,
  user_id      uuid not null references users(id) on delete cascade,
  browser      text not null default '',
  os           text not null default '',
  place        text not null default '',
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  -- Sessions end 30 days after their last use.
  expires_at   timestamptz not null default now() + interval '30 days'
);
create index sessions_user on sessions (user_id, last_seen_at desc);

-- ---------------------------------------------------------------------------------------------------------------
-- Summaries and usage

create table summaries (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references users(id) on delete cascade,
  title          text not null,
  source_text    text not null check (length(source_text) between 1 and 20000),
  sentences      jsonb not null,
  points         jsonb not null,
  figures        jsonb not null default '[]',
  figure_status  figure_status not null default 'none',
  length         summary_length not null,
  model          text not null,
  input_tokens   integer not null check (input_tokens >= 0),
  output_tokens  integer not null check (output_tokens >= 0),
  cost_usd       numeric(10, 6) not null check (cost_usd >= 0),
  seconds        numeric(6, 2) not null check (seconds >= 0),
  words_in       integer not null check (words_in >= 0),
  words_out      integer not null check (words_out >= 0),
  created_at     timestamptz not null default now()
);
-- The paged library: newest first.
create index summaries_user_created on summaries (user_id, created_at desc, id desc);
-- Spend per day and per month for the console.
create index summaries_created on summaries (created_at desc, id desc);

-- One row per use of the limit. Written only by claim_use() / give_back(), never directly.
create table usage_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references users(id) on delete cascade,
  is_guest   boolean not null,
  created_at timestamptz not null default now()
);
create index usage_user_created on usage_events (user_id, created_at desc);
create index usage_guest_created on usage_events (created_at desc) where is_guest;

create table settings (
  id                 boolean primary key default true check (id),
  -- The app's own monthly cap; at it, new summaries are refused calmly. The Anthropic limit is the hard stop above.
  monthly_cap_usd    numeric(8, 2) not null default 8.00 check (monthly_cap_usd > 0),
  workspace_cap_usd  numeric(8, 2) not null default 10.00 check (workspace_cap_usd > 0),
  check (monthly_cap_usd <= workspace_cap_usd)
);
insert into settings default values;

-- ---------------------------------------------------------------------------------------------------------------
-- The limit, in one atomic step

-- Checks every limit and, if allowed, records the use. Locks the user's row so two tabs can't both take the last one.
-- Returns: ok, reason (null | 'suspended' | 'hour' | 'day' | 'guests_day' | 'cap'), use_id, used_hour, limit_hour,
-- next_free_at (when the oldest use in the hour frees up).
create or replace function claim_use(p_user uuid)
returns table (ok boolean, reason text, use_id bigint, used_hour integer, limit_hour integer, next_free_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  u           users%rowtype;
  guest       boolean;
  hour_start  timestamptz;
  n_hour      integer;
  n_day       integer;
  n_guests    integer;
  month_spend numeric;
  cap         numeric;
  lim         integer;
  oldest      timestamptz;
  new_id      bigint;
begin
  if p_user is distinct from app_user_id() then
    raise exception 'claim_use: not the acting user';
  end if;
  select * into u from users where id = p_user for update;
  if not found then raise exception 'claim_use: no such user'; end if;
  if u.suspended_at is not null then
    return query select false, 'suspended', null::bigint, 0, 0, null::timestamptz; return;
  end if;

  guest := u.role = 'guest';
  lim := case when guest then 5 else 10 end;
  hour_start := greatest(now() - interval '1 hour', coalesce(u.limit_reset_at, '-infinity'));

  select count(*), min(created_at) into n_hour, oldest from usage_events where user_id = p_user and created_at > hour_start;
  if n_hour >= lim then
    return query select false, 'hour', null::bigint, n_hour, lim, oldest + interval '1 hour'; return;
  end if;

  if guest then
    select count(*) into n_guests from usage_events where is_guest and created_at > date_trunc('day', now());
    if n_guests >= 50 then
      return query select false, 'guests_day', null::bigint, n_hour, lim, null::timestamptz; return;
    end if;
  else
    select count(*) into n_day from usage_events where user_id = p_user and created_at > date_trunc('day', now());
    if n_day >= 30 then
      return query select false, 'day', null::bigint, n_hour, lim, null::timestamptz; return;
    end if;
  end if;

  select monthly_cap_usd into cap from settings;
  select coalesce(sum(cost_usd), 0) into month_spend from summaries where created_at >= date_trunc('month', now());
  if month_spend >= cap then
    return query select false, 'cap', null::bigint, n_hour, lim, null::timestamptz; return;
  end if;

  insert into usage_events (user_id, is_guest) values (p_user, guest) returning id into new_id;
  update users set last_active_at = now() where id = p_user;
  return query select true, null::text, new_id, n_hour + 1, lim, coalesce(oldest, now()) + interval '1 hour';
end $$;

-- A request that failed before Claude returned a summary gives its use back: failures never cost the user.
create or replace function give_back(p_use bigint) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  delete from usage_events where id = p_use and user_id = app_user_id() and created_at > now() - interval '10 minutes';
  return found;
end $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Sign-in: the few lookups that must happen before we know who is acting. Each returns only what it needs.

-- Finds an account by email or username for sign-in. Returns nothing for guests or unknown names.
create or replace function find_account(p_identifier text)
returns table (id uuid, password_hash text, suspended boolean)
language sql stable security definer set search_path = public as $$
  select u.id, u.password_hash, u.suspended_at is not null
  from users u
  where u.role <> 'guest' and (u.email = lower(p_identifier) or u.username = lower(p_identifier))
$$;

-- Turns a session token's hash into its user, if the session is live; extends it on use.
create or replace function session_owner(p_token_hash bytea)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  owner uuid;
begin
  update sessions set last_seen_at = now(), expires_at = now() + interval '30 days'
  where token_hash = p_token_hash and expires_at > now()
  returning user_id into owner;
  return owner;
end $$;

-- Live answers while someone types a username or email on the sign-up form.
create or replace function username_taken(p_username text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from users where username = lower(p_username))
$$;

create or replace function email_taken(p_email text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from users where email = lower(p_email))
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Audit and events (append-only)

create table audit_log (
  id             bigint generated always as identity primary key,
  actor_id       uuid references users(id) on delete set null,
  action         text not null,
  target_user_id uuid references users(id) on delete set null,
  -- Metadata only: never a user's text.
  details        jsonb not null default '{}',
  reason         text,
  place          text not null default '',
  created_at     timestamptz not null default now()
);
create index audit_created on audit_log (created_at desc, id desc);
create index audit_target on audit_log (target_user_id, created_at desc);

create table auth_events (
  id         bigint generated always as identity primary key,
  user_id    uuid references users(id) on delete set null,
  kind       text not null check (kind in ('signup', 'guest', 'signin', 'signin_failed', 'upgrade', 'delete')),
  detail     text not null default '',
  place      text not null default '',
  created_at timestamptz not null default now()
);
create index auth_created on auth_events (created_at desc, id desc);

create table request_errors (
  id          bigint generated always as identity primary key,
  -- The id the user can quote ("req_7f3a9c").
  request_id  text not null unique,
  user_id     uuid references users(id) on delete set null,
  code        text not null,
  detail      text not null default '',
  created_at  timestamptz not null default now()
);
create index errors_created on request_errors (created_at desc, id desc);

-- One sample a minute from the collector on the box; kept 7 days.
create table server_samples (
  taken_at    timestamptz primary key default now(),
  cpu         numeric(5, 2) not null,
  load1       numeric(6, 2) not null,
  memory      numeric(5, 2) not null,
  disk        numeric(5, 2) not null,
  db_size_mb  numeric(10, 2) not null,
  connections integer not null
);

-- ---------------------------------------------------------------------------------------------------------------
-- Row-level security: every user table answers only for the acting user

alter table users enable row level security;
alter table users force row level security;
create policy users_self on users using (id = app_user_id()) with check (id = app_user_id());

alter table sessions enable row level security;
alter table sessions force row level security;
create policy sessions_self on sessions using (user_id = app_user_id()) with check (user_id = app_user_id());

alter table summaries enable row level security;
alter table summaries force row level security;
create policy summaries_read on summaries for select using (user_id = app_user_id());
create policy summaries_add on summaries for insert with check (user_id = app_user_id());
create policy summaries_remove on summaries for delete using (user_id = app_user_id());
-- No update policy: a saved summary never changes.

alter table usage_events enable row level security;
alter table usage_events force row level security;
create policy usage_read on usage_events for select using (user_id = app_user_id());

-- ---------------------------------------------------------------------------------------------------------------
-- The app's grants

do $$ begin
  if not exists (select from pg_roles where rolname = 'distill_app') then
    create role distill_app login;
  end if;
end $$;

grant usage on schema public to distill_app;
grant select, insert, update, delete on users, sessions to distill_app;
grant select, insert, delete on summaries to distill_app;
grant select on usage_events, settings to distill_app;
-- Security-definer functions run as the owner: nobody else may call them.
revoke execute on all functions in schema public from public;
grant execute on function app_user_id(), claim_use(uuid), give_back(bigint), find_account(text), session_owner(bytea),
  username_taken(text), email_taken(text) to distill_app;
-- Append-only: the app can add and read, never change or remove.
grant select, insert on audit_log, auth_events, request_errors, server_samples to distill_app;
grant usage on all sequences in schema public to distill_app;
