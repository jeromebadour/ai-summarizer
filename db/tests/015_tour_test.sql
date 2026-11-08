-- Proves migration 015. Self-contained; run after all migrations.
\set ON_ERROR_STOP on
delete from sessions;
update users set role = 'user' where role = 'owner';
delete from users;
alter table users alter column tour_done_at drop default;
insert into users (id, name, username, email, password_hash) values
  ('00000000-0000-0000-0000-0000000000a1', 'Kevin Novak', 'kevin_n', 'kevin@example.com', 'x'),
  ('00000000-0000-0000-0000-0000000000a2', 'Lena Schmidt', 'lena_s', 'lena@example.com', 'x');

set role distill_app;
do $$ begin
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000a1', true);
  -- A new account hasn't seen the tour.
  assert (select tour_done_at from users) is null, 'a new account starts with the tour done';
  -- Finishing it is saved for this person only (row-level security).
  update users set tour_done_at = now();
  assert (select tour_done_at from users) is not null, 'could not save the tour as done';
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000a2', true);
  assert (select tour_done_at from users) is null, 'one person''s tour changed another''s';
end $$;
reset role;
\echo 015 tour: all checks passed
