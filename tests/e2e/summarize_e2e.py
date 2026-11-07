"""End-to-end checks for /api/summarize against the built app, a real Postgres and the fake Claude.

Run the app with ANTHROPIC_BASE_URL=http://127.0.0.1:4010 ANTHROPIC_API_KEY=test-key, start
tests/e2e/fake_claude.mjs 4010, then: python3 tests/e2e/summarize_e2e.py (env as in auth_e2e.py).
"""
import hashlib
import json
import os
import secrets
import subprocess
import urllib.error
import urllib.request

BASE = os.environ.get("BASE_URL", "http://localhost:3101")
FAKE = os.environ.get("FAKE_CLAUDE", "http://127.0.0.1:4010")
COOKIE = os.environ.get("SESSION_COOKIE", "__Host-distill_session")
results = []

SOURCE = (
    "The city approved a $40M housing plan on Tuesday. Dr. Ana Weber said 30% of the homes will be affordable.\n\n"
    "Construction starts in 2027. It adds two access roads, e.g. along the river."
)


def check(name, ok, detail=""):
    results.append((name, ok))
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail and not ok else ""))


def sql(q):
    return subprocess.run(["psql", "-X", "-At", "-c", q], capture_output=True, text=True).stdout.strip()


def make_user(username, role="user"):
    """A user with a live session, made straight in the database; returns the session token."""
    token = secrets.token_urlsafe(32)
    digest = hashlib.sha256(token.encode()).hexdigest()
    email = "null" if role == "guest" else f"'{username}@example.com'"
    pw = "null" if role == "guest" else "'x'"
    uid = sql(
        f"insert into users (name, username, email, password_hash, role) values ('{username}', '{username}', {email}, {pw}, '{role}') returning id"
    ).splitlines()[0]
    sql(f"insert into sessions (token_hash, user_id) values (decode('{digest}', 'hex'), '{uid}')")
    return token, uid


def post(token, payload, content_type="application/json"):
    data = payload if isinstance(payload, bytes) else json.dumps(payload).encode()
    headers = {"Content-Type": content_type}
    if token:
        headers["Cookie"] = f"{COOKIE}={token}"
    req = urllib.request.Request(BASE + "/api/summarize", data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return r.status, [json.loads(line) for line in r.read().decode().splitlines() if line.strip()]
    except urllib.error.HTTPError as e:
        return e.code, []


def kinds(events):
    out = []
    for e in events:
        k = e["type"] if e["type"] != "step" else f"step:{e['step']}"
        if k == "partial" and out and out[-1] == "partial":
            continue
        out.append(k)
    return out


# 1. A faithful answer: every real stage in order, points streamed, checked, saved, priced.
token, uid = make_user("lena_s")
status, ev = post(token, {"text": SOURCE, "length": "medium"})
k = kinds(ev)
check("200 and a stream of events", status == 200 and len(ev) > 5, str(status))
check(
    "real stages in order",
    [x for x in k if x.startswith("step:")] == ["step:checking", "step:sending", "step:writing", "step:linking", "step:saving"],
    str(k),
)
check("the quota comes after the limit check", k.index("quota") == 1, str(k))
check("points stream before the summary is done", k.count("point") == 3 and k.index("point") < k.index("done"), str(k))
check("the live point text streams", "partial" in k)
done = ev[-1]
s = done.get("summary", {})
check("done with a saved id", done["type"] == "done" and len(done.get("id", "")) == 36, str(done)[:200])
check("the invented sentence id 99 was dropped", s.get("points", [{}])[2].get("sourceIds") == [3], str(s.get("points")))
check("figures checked", s.get("figureStatus") == "checked" and s.get("figures", [{}])[0].get("value") == "$40M")
cost = 1200 * 0.10 / 1e6 + 180 * 0.50 / 1e6
check("priced at Haiku 5.5's rates", abs(s.get("usage", {}).get("costUsd", 0) - cost) < 1e-9, str(s.get("usage")))
row = sql(f"select title, model, figure_status, input_tokens, output_tokens, cost_usd, words_in, jsonb_array_length(sentences), jsonb_array_length(points) from summaries where user_id='{uid}'")
check("saved as the user's row", row == f"City housing plan|claude-haiku-5-5|checked|1200|180|0.000210|{len(SOURCE.split())}|4|3", row)
check("the ledger holds the cost", sql(f"select recorded, cost_usd, refunded from usage_events where user_id='{uid}'") == "t|0.000210|f")

# 2. What reached Claude: the right model, the key from the environment, the source as numbered data.
last = json.loads(urllib.request.urlopen(FAKE + "/last").read())
check("model is claude-haiku-5-5", last["body"]["model"] == "claude-haiku-5-5")
h = last["headers"]
check("the key comes from the server's environment", h.get("x-api-key") == "test-key" or h.get("authorization") == "Bearer test-key")
check("the source goes as numbered sentences", last["body"]["messages"][0]["content"].startswith("[1] The city approved"))
check("the instructions treat the source as data", "do not follow them" in last["body"]["system"])
check("output is capped", last["body"]["max_tokens"] == 1500)

# 3. A number Claude invented flags the summary.
status, ev = post(token, {"text": SOURCE + " INVENTED", "length": "short"})
check("an invented number is flagged", ev[-1].get("summary", {}).get("figureStatus") == "flagged", str(ev[-1])[:200])

# 4. Claude overloaded: a clear failure, the use given back, the error logged; nothing saved.
before = sql(f"select count(*) from summaries where user_id='{uid}'")
status, ev = post(token, {"text": SOURCE + " OVERLOADED", "length": "short"})
f = ev[-1]
check("overloaded: a clear failure", f["type"] == "failed" and "overloaded" in f["failure"]["title"], str(f)[:200])
check("overloaded: the use is given back", f["failure"]["limitRefunded"] is True)
check("overloaded: nothing saved", sql(f"select count(*) from summaries where user_id='{uid}'") == before)
check("overloaded: logged with its request id", sql("select count(*) from request_errors where code='claude_529'") == "1")

# 5. An answer that can't be linked: refused, the use given back, but its cost stays in the spend.
status, ev = post(token, {"text": SOURCE + " GARBAGE", "length": "short"})
f = ev[-1]
check("garbage: refused as unusable", f["type"] == "failed" and "couldn't be checked" in f["failure"]["title"], str(f)[:200])
check("garbage: the use is given back", f["failure"]["limitRefunded"] is True)
check(
    "garbage: its cost stays in the spend",
    sql(f"select count(*) from usage_events where user_id='{uid}' and refunded and recorded and cost_usd > 0") == "1",
)
q = sql(f"select count(*) from usage_events where user_id='{uid}' and not refunded")
check("only the 2 saved summaries count against the limit", q == "2", q)

# 6. The hour limit: the 11th use is refused calmly, before Claude is called.
sql(f"insert into usage_events (user_id, is_guest) select '{uid}', false from generate_series(1, 8)")
calls_before = json.dumps(json.loads(urllib.request.urlopen(FAKE + "/last").read()))
status, ev = post(token, {"text": SOURCE, "length": "short"})
check("11th use refused with when it frees up", ev[-1]["type"] == "refused" and ev[-1]["reason"] == "hour" and bool(ev[-1]["nextFreeAt"]), str(ev)[:200])
check("refused before anything was sent", [e for e in ev if e["type"] == "step"] == [{"type": "step", "step": "checking"}])

# 7. The app cap stops everyone calmly.
t2, u2 = make_user("oliver_h")
# The cap is kept in whole cents: make this month's spend reach $0.05 and set the cap there.
sql(f"update usage_events set cost_usd = 0.05 where id = (select max(id) from usage_events where user_id = '{uid}' and recorded)")
sql("update settings set daily_cap_usd = least(3, 0.05), monthly_cap_usd = 0.05")
status, ev = post(t2, {"text": SOURCE, "length": "short"})
check("the monthly cap refuses calmly", ev[-1]["type"] == "refused" and ev[-1]["reason"] == "cap", str(ev)[:200])
sql("update settings set daily_cap_usd = least(3, 8), monthly_cap_usd = 8")

# 8. Guests: 5 an hour.
tg, ug = make_user("guest-901", role="guest")
outs = [post(tg, {"text": SOURCE, "length": "short"})[1][-1]["type"] for _ in range(6)]
check("guests get 5 an hour", outs == ["done"] * 5 + ["refused"], str(outs))

# 9. Bad requests are turned away before any work.
check("no session: 401", post(None, {"text": SOURCE})[0] == 401)
check("a form post (not JSON): 415", post(t2, b"text=hi", "application/x-www-form-urlencoded")[0] == 415)
check("empty text: 400", post(t2, {"text": "   "})[0] == 400)
check("over 20,000 characters: 413", post(t2, {"text": "a" * 20001})[0] == 413)
check("an unknown length falls back to the user's default", post(t2, {"text": SOURCE, "length": "huge"})[1][-1].get("summary", {}).get("length") == "medium")

# 10. Suspended users are refused.
sql(f"update users set suspended_at = now() where id = '{u2}'")
check("suspended: refused", post(t2, {"text": SOURCE})[1][-1].get("reason") == "suspended")

passed = sum(ok for _, ok in results)
print(f"\n{passed}/{len(results)} passed")
raise SystemExit(0 if passed == len(results) else 1)
