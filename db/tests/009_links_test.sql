-- Proves migration 009. Self-contained; run after all migrations.
\set ON_ERROR_STOP on
delete from sessions;
update users set role = 'user' where role = 'owner';
delete from users;
insert into users (id, name, username, email, password_hash) values
  ('00000000-0000-0000-0000-0000000000a1', 'Kevin Novak', 'kevin_n', 'kevin@example.com', 'x'),
  ('00000000-0000-0000-0000-0000000000a2', 'Lena Schmidt', 'lena_s', 'lena@example.com', 'x');

set role distill_app;
do $$ begin
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000a1', true);
  -- New accounts draw every link by default.
  assert (select links from users) = 'always', 'the default is not always';
  -- Each person changes only their own choice (row-level security).
  update users set links = 'hover';
  assert (select links from users) = 'hover', 'could not save hover';
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000a2', true);
  assert (select links from users) = 'always', 'one person changed another person''s choice';
  -- Only the two known values.
  begin
    update users set links = 'sometimes';
    raise exception 'an unknown value was stored';
  exception when invalid_text_representation then null;
  end;
end $$;
reset role;
\echo 009 links: all checks passed
