#!/usr/bin/env bash
# Proves the newest backup restores (ops/systemd/distill-restore-test.timer weekly, and by hand). Restores it into a
# scratch database next to the live one, checks every table came back and the restored schema is the live one, prints
# both row counts, drops the scratch database and writes the result for the console (BACKUP_DIR/restore-test.json).
set -euo pipefail
dir=${BACKUP_DIR:-/srv/distill/backups}
scratch=distill_restore_test

db=$(docker ps -q --filter label=com.docker.compose.project=distill --filter label=com.docker.compose.service=db)
[ -n "$db" ] || { echo "restore test: the database container is not running" >&2; exit 1; }
dump=$(find "$dir" -maxdepth 1 -name 'distill-*.dump' -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
[ -n "$dump" ] || { echo "restore test: no backup in $dir" >&2; exit 1; }

psql_in() { docker exec -i "$db" psql -X -At -U postgres -v ON_ERROR_STOP=1 -d "$1" -c "$2"; }
cleanup() { docker exec "$db" dropdb -U postgres --if-exists "$scratch" >/dev/null 2>&1 || true; }
trap cleanup EXIT

start=$(date +%s%N)
cleanup
docker exec "$db" createdb -U postgres "$scratch"
ok=true
# A restore that fails is still recorded (the console flags it), so it doesn't stop the script here.
if ! docker exec -i "$db" pg_restore -U postgres -d "$scratch" --exit-on-error < "$dump"; then ok=false; fi
ms=$(( ($(date +%s%N) - start) / 1000000 ))
seconds=$((ms / 1000)).$(( (ms % 1000) / 100 ))

tables="users sessions summaries usage_events audit_log auth_events request_errors settings server_samples email_tokens schema_migrations"
echo "restore test: $(basename "$dump") into $scratch in $seconds s"
printf '  %-18s %10s %10s\n' table live restored
for t in $tables; do
  live=$(psql_in distill "select count(*) from $t")
  back=$(psql_in "$scratch" "select count(*) from $t" 2>/dev/null) || { back=missing; ok=false; }
  printf '  %-18s %10s %10s\n' "$t" "$live" "$back"
done
live_schema=$(psql_in distill "select max(name) from schema_migrations")
back_schema=$(psql_in "$scratch" "select max(name) from schema_migrations" 2>/dev/null) || back_schema=missing
[ "$live_schema" = "$back_schema" ] || ok=false
# A database with accounts must not come back empty (an empty one, as in CI, restores to empty).
if [ "$(psql_in distill "select count(*) from users")" -ge 1 ]; then
  [ "$(psql_in "$scratch" "select count(*) from users" 2>/dev/null || echo 0)" -ge 1 ] || ok=false
fi
echo "  schema: live $live_schema, restored $back_schema"

printf '{"at": "%s", "seconds": %s, "ok": %s, "dump": "%s"}\n' "$(date -u +%FT%TZ)" "$seconds" "$ok" "$(basename "$dump")" > "$dir/restore-test.json"
chmod 600 "$dir/restore-test.json"
if $ok; then echo "RESTORE OK"; else echo "RESTORE FAILED"; exit 1; fi
