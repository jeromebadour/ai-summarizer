-- Test databases only: accounts a test inserts directly stand for accounts that existed before email confirmation, so
-- they count as confirmed. Accounts the app creates still start unconfirmed (trigger users_start_unverified, 012).
alter table users alter column email_verified_at set default now();
-- Accounts a test inserts have seen the tour (015); the tour's own test drops this default.
alter table users alter column tour_done_at set default now();
