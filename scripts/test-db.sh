#!/usr/bin/env bash
# Runs every database test file on its own fresh database with all migrations applied.
# Needs a Postgres owner connection in PGHOST / PGPORT / PGUSER (and PGPASSWORD if it asks).
set -uo pipefail
cd "$(dirname "$0")/.."
db=distill_dbtest
failed=0
for test in db/tests/*.sql; do
  dropdb --if-exists "$db" >/dev/null 2>&1
  createdb "$db" || exit 1
  for migration in db/migrations/*.sql; do
    psql -X -q -v ON_ERROR_STOP=1 -d "$db" -f "$migration" >/dev/null || { echo "FAIL migration $migration"; exit 1; }
  done
  if out=$(psql -X -q -v ON_ERROR_STOP=1 -d "$db" -f "$test" 2>&1); then
    echo "PASS $test"
  else
    echo "FAIL $test"
    echo "$out" | tail -5
    failed=1
  fi
done
dropdb --if-exists "$db" >/dev/null 2>&1
exit $failed
