-- Proves migration 014. Self-contained; run after all migrations.
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
  -- New accounts start with the split view.
  assert (select result_view from users) = 'split', 'the default is not split';
  -- Each person changes only their own choice (row-level security).
  update users set result_view = 'column';
  assert (select result_view from users) = 'column', 'could not save column';
  perform set_config('app.user_id', '00000000-0000-0000-0000-0000000000a2', true);
  assert (select result_view from users) = 'split', 'one person changed another person''s choice';
  -- Only the two known values.
  begin
    update users set result_view = 'grid';
    raise exception 'an unknown value was stored';
  exception when invalid_text_representation then null;
  end;
end $$;
reset role;
\echo 014 result view: all checks passed
