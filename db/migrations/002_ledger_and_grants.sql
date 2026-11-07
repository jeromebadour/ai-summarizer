-- Distill: migration 002. Three holes found in 001 before anything was deployed, fixed at their root.
--
-- 1. Spend was summed from `summaries`, which users can delete. Deleting summaries (or the account) lowered the
--    month's spend, so the cap could be walked past and the console's spend changed after the fact. Fix: the use
--    record (`usage_events`) is now the spend ledger. It carries tokens and cost, is written only by functions, and
--    no user action removes it. `summaries.cost_usd` stays for the summary's own telemetry line.
-- 2. Deleting an account cascaded its usage rows, so a deleted-and-recreated guest started with a fresh limit and
--    the shared guest day count went down. Fix: usage rows outlive the user (user_id set null).
-- 3. The app could update every column of the acting user's own row, including role, suspension and the limit
--    reset. Code never did, but nothing stopped it. Fix: column grants. Role changes, guests, upgrades, suspension
--    and resets happen only in narrow functions.

-- ---------------------------------------------------------------------------------------------------------------
-- 1 + 2: the ledger

alter table usage_events
  add column input_tokens  integer not null default 0 check (input_tokens >= 0),
  add column output_tokens integer not null default 0 check (output_tokens >= 0),
  add column cost_usd      numeric(10, 6) not null default 0 check (cost_usd >= 0),
  add column recorded      boolean not null default false;

alter table usage_events alter column user_id drop not null;
alter table usage_events drop constraint usage_events_user_id_fkey;
alter table usage_events add constraint usage_events_user_id_fkey
  foreign key (user_id) references users(id) on delete set null;

create index usage_created on usage_events (created_at desc, id desc);

-- Called once, after Claude answered: puts the real tokens and cost on the use. A use is priced once only.
create or replace function record_cost(p_use bigint, p_in integer, p_out integer, p_cost numeric) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update usage_events set input_tokens = p_in, output_tokens = p_out, cost_usd = p_cost, recorded = true
  where id = p_use and user_id = app_user_id() and not recorded;
  return found;
end $$;

-- A priced use is never given back: Claude was paid for it.
create or replace function give_back(p_use bigint) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  delete from usage_events
  where id = p_use and user_id = app_user_id() and not recorded and created_at > now() - interval '10 minutes';
  return found;
end $$;

-- claim_use: the same checks as 001, with the month's spend read from the ledger.
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
    -- Lock the settings row so two guests can't both take the 50th use of the day.
    perform 1 from settings for update;
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
  select coalesce(sum(cost_usd), 0) into month_spend from usage_events where created_at >= date_trunc('month', now());
  if month_spend >= cap then
    return query select false, 'cap', null::bigint, n_hour, lim, null::timestamptz; return;
  end if;

  insert into usage_events (user_id, is_guest) values (p_user, guest) returning id into new_id;
  update users set last_active_at = now() where id = p_user;
  return query select true, null::text, new_id, n_hour + 1, lim, coalesce(oldest, now()) + interval '1 hour';
end $$;

-- ---------------------------------------------------------------------------------------------------------------
-- 3: what the app may write on a user's own row

revoke insert, update on users from distill_app;
-- Sign-up: a real account. role, suspension and reset take their defaults ('user', none, none).
grant insert (id, name, username, email, password_hash, avatar_colour, default_length, theme, motion,
              password_changed_at) on users to distill_app;
-- Profile, preferences, password, activity.
grant update (name, username, email, password_hash, avatar_colour, default_length, theme, motion,
              last_active_at, password_changed_at) on users to distill_app;

-- Guests: "Guest 31" / @guest-31. The number comes from a sequence, so two guests never share one.
create sequence guest_number;
grant usage on sequence guest_number to distill_app;

create or replace function create_guest() returns uuid
language plpgsql security definer set search_path = public as $$
declare
  n bigint := nextval('guest_number');
  new_id uuid;
begin
  insert into users (name, username, role) values ('Guest ' || n, 'guest-' || n, 'guest') returning id into new_id;
  return new_id;
end $$;

-- Upgrading a guest: the same row becomes a real account, so every summary and use stays attached.
create or replace function upgrade_guest(p_name text, p_username text, p_email text, p_password_hash text)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update users
  set role = 'user', name = p_name, username = lower(p_username), email = lower(p_email),
      password_hash = p_password_hash, password_changed_at = now()
  where id = app_user_id() and role = 'guest';
  return found;
end $$;

-- The owner can't delete their own account (the console would have no owner).
create or replace function keep_owner() returns trigger
language plpgsql as $$
begin
  if old.role = 'owner' then raise exception 'the owner account cannot be deleted'; end if;
  return old;
end $$;
create trigger users_keep_owner before delete on users for each row execute function keep_owner();

-- Sign-in throttle: failed attempts on one account in the last 15 minutes (read before the user is known).
create or replace function recent_failures(p_user uuid) returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::integer from auth_events
  where user_id = p_user and kind = 'signin_failed' and created_at > now() - interval '15 minutes'
$$;

revoke execute on all functions in schema public from public;
grant execute on function app_user_id(), claim_use(uuid), give_back(bigint), record_cost(bigint, integer, integer, numeric),
  find_account(text), session_owner(bytea), username_taken(text), email_taken(text), create_guest(),
  upgrade_guest(text, text, text, text), recent_failures(uuid) to distill_app;
