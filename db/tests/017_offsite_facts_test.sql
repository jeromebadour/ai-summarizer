-- Proves migration 017. Self-contained; run after all migrations.
\set ON_ERROR_STOP on
delete from server_facts;
set role distill_collector;
select record_server_facts('{"os": "Ubuntu", "offsite": {"at": "2026-11-09T02:48:00Z", "ok": true, "count": 3, "keepDays": 30}, "planted": "x"}');
reset role;
do $$
declare f jsonb;
begin
  select facts into f from server_facts;
  assert (f->'offsite'->>'ok')::boolean and (f->'offsite'->>'count')::int = 3, 'the off-box facts were not kept: ' || f::text;
  assert not (f ? 'planted'), 'an unknown fact was kept: ' || f::text;
end $$;
\echo 017 offsite facts: all checks passed
