-- Proves migration 010. Self-contained; run after all migrations.
\set ON_ERROR_STOP on
delete from usage_events;
delete from summaries;
delete from sessions;
update users set role = 'user' where role = 'owner';
delete from users;
insert into users (id, name, username, email, password_hash) values
  ('00000000-0000-0000-0000-0000000000b1', 'Kevin Novak', 'kevin_n', 'kevin@example.com', 'x');
insert into users (name, username, role) values ('Guest 1', 'guest-1', 'guest');
insert into summaries (user_id, title, source_text, sentences, points, figures, figure_status, length, model, input_tokens,
  output_tokens, cost_usd, seconds, words_in, words_out)
values ('00000000-0000-0000-0000-0000000000b1', 'SECRET', 'SECRET', '[]', '[]', '[{"id":1},{"id":2}]', 'checked', 'medium',
  'claude-haiku-5-5', 1, 1, 0.0001, 1, 300, 40);
insert into usage_events (user_id, is_guest, cost_usd, recorded, refunded, words) values
  ('00000000-0000-0000-0000-0000000000b1', false, 0.0001, true, false, 300),
  ('00000000-0000-0000-0000-0000000000b1', false, 0.0001, true, true, 500);

set role distill_app;
do $$
declare s jsonb;
begin
  -- Nobody signed in: the totals still come back.
  perform set_config('app.user_id', '', true);
  s := public_stats();
  assert (s->>'summaries')::int = 1, 'a refunded use was counted: ' || s::text;
  assert (s->>'words')::int = 300 and (s->>'figures')::int = 2, s::text;
  -- Since 016 the public totals carry no account count.
  assert not (s ? 'accounts'), 'the public stats still count accounts: ' || s::text;
  assert s::text not like '%SECRET%' and s::text not like '%kevin%', 'the stats carry somebody''s data';
end $$;
reset role;
\echo 010 public stats: all checks passed
