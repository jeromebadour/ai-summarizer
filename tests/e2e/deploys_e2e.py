"""End-to-end checks for the public deploys feed (migration 019): GET /api/public/deploys gives the deploy days (UTC,
oldest first, each once), the first day and the live commit, to anyone, with no cookie. Who may record and read is
proved in db/tests/019_deploys_test.sql. Env as in distill_e2e.py.
"""
import json
import os
import subprocess
import urllib.error
import urllib.request

BASE = os.environ.get("BASE_URL", "http://localhost:3101")
results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok)))
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail and not ok else ""))


def sql(q):
    r = subprocess.run(["psql", "-X", "-At", "-v", "ON_ERROR_STOP=1", "-c", q], capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"test SQL failed: {r.stderr.strip()}")


def feed():
    with urllib.request.urlopen(BASE + "/api/public/deploys") as r:
        return r.status, dict(r.headers), json.loads(r.read())


status, headers, body = feed()
check("with no deploys yet, the feed answers 200", status == 200, str(status))
check("with no deploys yet, it is empty", body == {"live_since": None, "deploys": [], "commit": None}, json.dumps(body))

# Deploys as the box records them: two on one day, one at 01:30 in UTC+3 (still the day before in UTC), one later.
sql("""insert into deploys (deployed_at, commit) values
  ('2026-11-07 09:00+00', '1111111'), ('2026-11-07 18:00+00', '2222222'),
  ('2026-11-09 01:30+03', '3333333'), ('2026-11-10 12:00+00', '4f35fdd')""")
status, headers, body = feed()
check("the feed gives the first day as live_since", body.get("live_since") == "2026-11-07", json.dumps(body))
check("each day once, in UTC, oldest first", body.get("deploys") == ["2026-11-07", "2026-11-08", "2026-11-10"], json.dumps(body))
check("the commit is the latest deploy's", body.get("commit") == "4f35fdd", json.dumps(body))
check("it holds only the three keys", sorted(body) == ["commit", "deploys", "live_since"], json.dumps(body))
lower = {k.lower(): v for k, v in headers.items()}
check("it sets no cookie", "set-cookie" not in lower, str(headers))
check("it is JSON", lower.get("content-type", "").startswith("application/json"), lower.get("content-type", ""))
check("caches may keep it a few minutes", lower.get("cache-control") == "public, max-age=300", lower.get("cache-control", ""))

try:
    urllib.request.urlopen(urllib.request.Request(BASE + "/api/public/deploys", data=b"{}", method="POST"))
    check_post = False
except urllib.error.HTTPError as e:
    check_post = e.code == 405
check("it is read-only (POST is refused)", check_post)

passed = sum(ok for _, ok in results)
print(f"{passed}/{len(results)} passed")
raise SystemExit(0 if passed == len(results) else 1)
