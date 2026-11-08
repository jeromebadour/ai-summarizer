#!/usr/bin/env bash
# Deploys one commit of Distill on the Freelance box. Run as root:
#
#   /srv/distill/app/scripts/deploy.sh <commit>          deploy it
#   /srv/distill/app/scripts/deploy.sh <commit> --check  only say whether it may be deployed
#
# It refuses unless: this is the Freelance box, the commit is on main, and CI passed on it (both jobs, read from
# GitHub). Then it moves the checkout forward to that commit, builds and starts it, waits for the health check,
# checks the public site, and installs and runs the box's collector (ops/collector.py, every minute by systemd).
# The build log goes to /srv/distill/deploy-logs/. The running version is only replaced once the new image has built;
# a failed build leaves it untouched.
#
# The whole script lives in main(), which bash reads in full before running anything: the deploy moves this very file
# forward, and a script edited while it runs must not pick up the new lines halfway.

main() {
  set -uo pipefail
  local box=vmi3464201 app=/srv/distill/app env=/srv/distill/.env logs=/srv/distill/deploy-logs tools=/opt/sites/tools/distill
  local repo=jeromebadour/ai-summarizer site=https://distill.jeromebadour.com

  stop() { echo "STOPPED: $*"; exit 1; }
  as_app() { sudo -u distill git -C "$app" "$@"; }

  [ "$(hostname)" = "$box" ] || stop "this is $(hostname), not the Freelance box ($box)"
  [ "$(id -u)" = 0 ] || stop "run it as root"
  [ $# -ge 1 ] || stop "which commit? e.g. scripts/deploy.sh 6e4c52e"
  local want=$1 only_check=${2:-}

  echo "== fetching"
  as_app fetch --quiet origin main || stop "git fetch failed"
  local sha
  sha=$(as_app rev-parse --verify --quiet "$want^{commit}") || stop "no commit $want on GitHub"
  as_app merge-base --is-ancestor "$sha" origin/main || stop "$want is not on main"
  local short=${sha:0:7}
  local live
  live=$(docker inspect -f '{{.Config.Image}}' "$(docker compose --env-file "$env" -f "$app/compose.yaml" ps -q app 2>/dev/null)" 2>/dev/null)
  echo "   live now: ${live:-nothing running}   asked: $short"

  echo "== CI on $short"
  local ci
  ci=$(curl -fsS "https://api.github.com/repos/$repo/commits/$sha/check-runs" | python3 -c '
import json, sys
runs = json.load(sys.stdin)["check_runs"]
for r in runs: print("   " + r["name"] + ": " + r["status"] + " " + (r["conclusion"] or ""))
ok = len(runs) >= 2 and all(r["status"] == "completed" and r["conclusion"] == "success" for r in runs)
print("PASSED" if ok else "NOT PASSED")') || stop "could not read CI from GitHub"
  echo "$ci" | grep -v '^PASSED$\|^NOT PASSED$'
  [ "$(echo "$ci" | tail -1)" = PASSED ] || stop "CI has not passed on $short: nothing deployed"
  echo "   passed"

  if [ "$only_check" = --check ]; then echo "OK: $short may be deployed (nothing changed)"; exit 0; fi

  echo "== moving the checkout to $short"
  as_app merge --ff-only --quiet "$sha" || stop "could not move forward to $short (local changes on the box?)"
  [ "$(as_app rev-parse HEAD)" = "$sha" ] || stop "checkout is not at $short"

  mkdir -p "$logs"
  local log
  log="$logs/$(date -u +%Y%m%d-%H%M)-$short.log"
  echo "== building and starting (about a minute; log: $log)"
  cd "$app" || stop "no $app"
  APP_COMMIT=$short docker compose --env-file "$env" up -d --build 2>&1 | tee "$log"
  [ "${PIPESTATUS[0]}" = 0 ] || stop "build or start failed (see $log); the running version was not replaced if the build failed"

  echo "== waiting for the health check"
  local id state=""
  id=$(docker compose --env-file "$env" ps -q app)
  for _ in $(seq 1 40); do
    state=$(docker inspect -f '{{.State.Health.Status}}' "$id" 2>/dev/null)
    echo "   health: $state"
    [ "$state" = healthy ] && break
    [ "$state" = unhealthy ] && break
    sleep 3
  done
  [ "$state" = healthy ] || stop "the app is not healthy (docker compose --env-file $env logs app)"

  local image code
  image=$(docker inspect -f '{{.Config.Image}}' "$id")
  [ "$image" = "distill-app:$short" ] || stop "running $image, expected distill-app:$short"
  code=$(curl -s -o /dev/null -w '%{http_code}' "$site/login")
  [ "$code" = 200 ] || stop "$site/login answered $code"

  # The box reports itself to the console (ops/collector.py, migration 011): installed from this commit, run once now
  # with the host's facts (so "Deployed" is current), then every minute by its timer.
  echo "== the box's collector"
  install -d -m 755 "$tools"
  install -m 755 "$app/ops/collector.py" "$app/ops/backup.sh" "$app/ops/restore-test.sh" "$tools/"
  install -m 644 "$app"/ops/systemd/distill-*.service "$app"/ops/systemd/distill-*.timer /etc/systemd/system/
  systemctl daemon-reload
  systemctl enable --now --quiet distill-collector.timer || stop "the collector's timer would not start"
  # Nightly backups and the weekly restore test (ops/backup.sh, ops/restore-test.sh).
  systemctl enable --now --quiet distill-backup.timer distill-restore-test.timer || stop "the backup timers would not start"
  /usr/bin/python3 "$tools/collector.py" --facts || stop "the collector failed (journalctl -u distill-collector -n 20)"
  echo "   reading and facts recorded; next reading $(systemctl show distill-collector.timer -p NextElapseUSecRealtime --value)"
  echo "   next backup $(systemctl show distill-backup.timer -p NextElapseUSecRealtime --value)"
  echo "DEPLOYED $short: $image healthy, $site/login 200, the box reporting"
}

main "$@"; exit
