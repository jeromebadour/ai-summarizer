#!/usr/bin/env bash
# Runs the browser suites against a running app (BASE_URL, default http://localhost:3101) that uses the fake Claude
# (tests/e2e/fake_claude.mjs). PGDATABASE is the app's database, reached as its owner; each suite starts from empty
# tables. Optional: CHROME (a Chrome binary; Playwright's own Chromium otherwise), SHOTS (a folder for pictures).
set -uo pipefail
cd "$(dirname "$0")/.."
suites=${*:-auth account email summarize distill saved prefs links phone admin admin_actions}
failed=0
for suite in $suites; do
  psql -X -q -v ON_ERROR_STOP=1 -f tests/e2e/reset.sql >/dev/null || exit 1
  rm -f "${OUTBOX:-/tmp/distill-outbox}"/*.json
  echo "== $suite"
  if python3 tests/e2e/${suite}_e2e.py > "/tmp/e2e-$suite.log" 2>&1; then
    grep -E "passed$" "/tmp/e2e-$suite.log"
  else
    grep -E "^FAIL|Error|passed$" "/tmp/e2e-$suite.log" | head -20
    failed=1
  fi
done
exit $failed
