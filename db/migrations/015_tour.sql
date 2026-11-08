-- The first-time tour: when this person finished or skipped it. Empty means the tour opens on their next visit to
-- Distill (new accounts, guests, and accounts from before the tour). Each person sets only their own.
alter table users add column tour_done_at timestamptz;
grant update (tour_done_at) on users to distill_app;
