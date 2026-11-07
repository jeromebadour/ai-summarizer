-- Distill: migration 012. Email verification, password reset and email changes, by a 6-digit code or a link.
-- Only hashes are stored (SHA-256 of the code and of the link's token), each works once, for 24 hours (verify) or 30
-- minutes (reset), five wrong codes end it, and a new one replaces the old. An account whose email isn't confirmed can't
-- summarize: the app sends it to /verify, and the database refuses its uses as a backstop.

alter table users add column if not exists email_verified_at timestamptz;
alter table users add column if not exists pending_email text check (pending_email = lower(pending_email));
-- Accounts from before this rule count as verified (nobody is locked out by it).
update users set email_verified_at = coalesce(created_at, now()) where role <> 'guest' and email is not null and email_verified_at is null;

-- Every account the app creates starts unconfirmed, whatever the column's default: the app can't make a confirmed one.
create or replace function users_start_unverified() returns trigger
language plpgsql as $$
begin
  if current_user = 'distill_app' then new.email_verified_at := null; end if;
  return new;
end $$;
create or replace trigger users_start_unverified before insert on users for each row execute function users_start_unverified();

-- A guest who makes an account gives an email that must be confirmed too.
create or replace function guest_upgrade_unverified() returns trigger
language plpgsql as $$
begin
  if old.role = 'guest' and new.role <> 'guest' then new.email_verified_at := null; end if;
  return new;
end $$;
create or replace trigger guest_upgrade_unverified before update of role on users for each row execute function guest_upgrade_unverified();

-- The email only changes through a confirmed code or link (below); a change in Profile waits in pending_email.
revoke update (email) on users from distill_app;
grant update (pending_email) on users to distill_app;

create table if not exists email_tokens (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references users (id) on delete cascade,
  purpose    text not null check (purpose in ('verify', 'reset')),
  email      text not null,               -- the address it was sent to (for a change, the new one)
  code_hash  bytea not null,
  link_hash  bytea not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at    timestamptz,
  attempts   integer not null default 0
);
create index if not exists email_tokens_user on email_tokens (user_id, purpose, created_at desc);
revoke all on email_tokens from public;

-- A token that can still be used.
create or replace function token_live(t email_tokens) returns boolean
language sql immutable as $$
  select t.used_at is null and t.expires_at > now() and t.attempts < 5
$$;

-- Five a hour per account and purpose, whoever asks. A new token ends the old ones.
create or replace function issue_token(p_user uuid, p_purpose text, p_email text, p_code_hash bytea, p_link_hash bytea) returns void
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from email_tokens where user_id = p_user and purpose = p_purpose and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'email: too many';
  end if;
  update email_tokens set used_at = now() where user_id = p_user and purpose = p_purpose and used_at is null;
  insert into email_tokens (user_id, purpose, email, code_hash, link_hash, expires_at)
  values (p_user, p_purpose, lower(p_email), p_code_hash, p_link_hash,
          now() + case p_purpose when 'verify' then interval '24 hours' else interval '30 minutes' end);
end $$;

-- Confirming: the signed-in account's own email (after sign-up or a guest upgrade), or the pending new one.
-- Returns the address and name to send to, or null when there's nothing to confirm.
create or replace function issue_verify(p_code_hash bytea, p_link_hash bytea) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u users;
begin
  select * into u from users where id = app_user_id() and role <> 'guest' and suspended_at is null;
  if u.id is null then return null; end if;
  if u.pending_email is null and u.email_verified_at is not null then return null; end if;
  perform issue_token(u.id, 'verify', coalesce(u.pending_email, u.email), p_code_hash, p_link_hash);
  return jsonb_build_object('email', coalesce(u.pending_email, u.email), 'name', u.name);
end $$;

-- Whether this account is waiting for a confirmation, and a code it could still use exists.
create or replace function verify_waiting() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'email', coalesce(u.pending_email, u.email),
    'needed', u.pending_email is not null or u.email_verified_at is null,
    'live', exists (select 1 from email_tokens t where t.user_id = u.id and t.purpose = 'verify' and token_live(t))
  )
  from users u where u.id = app_user_id()
$$;

-- Applies a confirmed verify token: the address becomes the account's email, confirmed now.
create or replace function apply_verify(t email_tokens) returns text
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from users where email = t.email and id <> t.user_id) then
    update email_tokens set used_at = now() where id = t.id;
    return 'taken';
  end if;
  update email_tokens set used_at = now() where id = t.id;
  update users set email = t.email, email_verified_at = now(),
                   pending_email = case when pending_email = t.email then null else pending_email end
  where id = t.user_id;
  return 'ok';
end $$;

-- The code typed on /verify, for the signed-in account: 'ok', 'wrong', 'expired' (none live) or 'taken'.
create or replace function verify_by_code(p_code_hash bytea) returns text
language plpgsql security definer set search_path = public as $$
declare t email_tokens;
begin
  select * into t from email_tokens where user_id = app_user_id() and purpose = 'verify' and token_live(email_tokens)
  order by created_at desc limit 1 for update;
  if t.id is null then return 'expired'; end if;
  if t.code_hash <> p_code_hash then
    update email_tokens set attempts = attempts + 1 where id = t.id;
    return case when t.attempts + 1 >= 5 then 'expired' else 'wrong' end;
  end if;
  return apply_verify(t);
end $$;

-- The link from the email, from any browser: the account it confirmed (to sign in there), or null when it is used,
-- ended or unknown. 'taken' can't happen silently: it returns null too, after ending the token.
create or replace function verify_by_link(p_link_hash bytea) returns uuid
language plpgsql security definer set search_path = public as $$
declare t email_tokens;
begin
  select * into t from email_tokens where link_hash = p_link_hash and purpose = 'verify' for update;
  if t.id is null or not token_live(t) then return null; end if;
  if apply_verify(t) <> 'ok' then return null; end if;
  return t.user_id;
end $$;

-- Forgot password: by email, no session. Returns whom to write to, or null (the app answers the same either way).
create or replace function issue_reset(p_email text, p_code_hash bytea, p_link_hash bytea) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u users;
begin
  select * into u from users where email = lower(p_email) and role <> 'guest' and suspended_at is null;
  if u.id is null then return null; end if;
  perform issue_token(u.id, 'reset', u.email, p_code_hash, p_link_hash);
  return jsonb_build_object('email', u.email, 'name', u.name);
exception when others then
  if sqlerrm like 'email: too many%' then return null; end if;
  raise;
end $$;

-- The reset code typed after Forgot password: swaps it for a fresh one-time link token (whose hash the app made),
-- so the code page can open Set a new password. 'ok', 'wrong' or 'expired' (also for an email without an account).
create or replace function reset_code_to_link(p_email text, p_code_hash bytea, p_new_link_hash bytea) returns text
language plpgsql security definer set search_path = public as $$
declare t email_tokens;
begin
  select e.* into t from email_tokens e join users u on u.id = e.user_id
  where u.email = lower(p_email) and e.purpose = 'reset' and token_live(e)
  order by e.created_at desc limit 1 for update of e;
  if t.id is null then return 'expired'; end if;
  if t.code_hash <> p_code_hash then
    update email_tokens set attempts = attempts + 1 where id = t.id;
    return case when t.attempts + 1 >= 5 then 'expired' else 'wrong' end;
  end if;
  update email_tokens set link_hash = p_new_link_hash, code_hash = '\x00'::bytea where id = t.id;
  return 'ok';
end $$;

-- Who a reset link is for, without using it (Set a new password shows the address). Null when it can't be used.
create or replace function reset_link_email(p_link_hash bytea) returns text
language sql stable security definer set search_path = public as $$
  select t.email from email_tokens t where t.link_hash = p_link_hash and t.purpose = 'reset' and token_live(t)
$$;

-- Sets the new password from a reset link: ends every session of the account (the app then opens one here), and
-- confirms the email (the link proved it). Returns the account, or null when the link can't be used.
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
  return t.user_id;
end $$;

-- The backstop: an account whose email isn't confirmed can't record a use, whatever the app does.
create or replace function usage_needs_verified() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from users where id = new.user_id and role <> 'guest' and email_verified_at is null) then
    raise exception 'email_unverified';
  end if;
  return new;
end $$;
create or replace trigger usage_needs_verified before insert on usage_events for each row execute function usage_needs_verified();

revoke execute on function token_live(email_tokens), issue_token(uuid, text, text, bytea, bytea), apply_verify(email_tokens),
  usage_needs_verified() from public;
revoke execute on function issue_verify(bytea, bytea), verify_waiting(), verify_by_code(bytea), verify_by_link(bytea),
  issue_reset(text, bytea, bytea), reset_code_to_link(text, bytea, bytea), reset_link_email(bytea), reset_by_link(bytea, text) from public;
grant execute on function issue_verify(bytea, bytea), verify_waiting(), verify_by_code(bytea), verify_by_link(bytea),
  issue_reset(text, bytea, bytea), reset_code_to_link(text, bytea, bytea), reset_link_email(bytea), reset_by_link(bytea, text) to distill_app;
