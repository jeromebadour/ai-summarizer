#!/usr/bin/env bash
# Distill's nightly backup (ops/systemd/distill-backup.timer, as root on the box; installed by scripts/deploy.sh).
# A custom-format pg_dump of the whole database into BACKUP_DIR (root only), checked before it counts: a dump that
# pg_restore can't list is thrown away and the run fails. Dumps older than 14 days go. Prints one line per run.
set -euo pipefail
dir=${BACKUP_DIR:-/srv/distill/backups}
keep_days=14

db=$(docker ps -q --filter label=com.docker.compose.project=distill --filter label=com.docker.compose.service=db)
[ -n "$db" ] || { echo "backup: the database container is not running" >&2; exit 1; }

install -d -m 700 "$dir"
name="distill-$(date -u +%Y%m%d-%H%M%S).dump"
part="$dir/.$name.part"
trap 'rm -f "$part"' EXIT

docker exec "$db" pg_dump -U postgres -d distill --format=custom > "$part"
# The check: pg_restore must be able to read the whole table of contents back.
docker exec -i "$db" pg_restore --list < "$part" > /dev/null || { echo "backup: the dump can't be read back" >&2; exit 1; }
chmod 600 "$part"
mv "$part" "$dir/$name"
trap - EXIT

find "$dir" -maxdepth 1 -name 'distill-*.dump' -mmin +$((keep_days * 24 * 60)) -delete
echo "backup: $name $(stat -c %s "$dir/$name") bytes, $(find "$dir" -maxdepth 1 -name 'distill-*.dump' | wc -l) kept"
