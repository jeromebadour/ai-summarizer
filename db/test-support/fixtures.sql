-- Test databases only: accounts a test inserts directly stand for accounts that existed before email confirmation, so
-- they count as confirmed. Accounts the app creates still start unconfirmed (trigger users_start_unverified, 012).
alter table users alter column email_verified_at set default now();
