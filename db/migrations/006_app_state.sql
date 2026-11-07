-- Distill: migration 006. What the Distill screen needs to know before anyone presses Distill.
--
-- The screen shows a calm strip up front (paused, today's budget used, the month's cap reached) instead of letting
-- someone paste a long text and only then be refused. Those facts need sums over everyone's usage, which the app
-- role can't read (row-level security), so this narrow function answers just the yes / no and when it comes back.
-- It never returns anyone's rows. claim_use stays the real check; this only decides what the screen shows first.

create or replace function app_state()
returns table (all_paused boolean, guests_paused boolean, daily_cap_reached boolean, month_cap_reached boolean,
               day_resets_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.all_paused_at is not null,
         s.guests_paused_at is not null,
         (select coalesce(sum(cost_usd), 0) from usage_events where created_at >= date_trunc('day', now())) >= s.daily_cap_usd,
         (select coalesce(sum(cost_usd), 0) from usage_events where created_at >= date_trunc('month', now())) >= s.monthly_cap_usd,
         date_trunc('day', now()) + interval '1 day'
  from settings s
$$;

revoke execute on function app_state() from public;
grant execute on function app_state() to distill_app;
