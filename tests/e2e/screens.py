"""Pictures of every signed-in screen at the sizes in BUILD-RULES 2.17, from one realistic seeded world, plus a report
of any screen whose page scrolls or whose content is cut off. Not a pass/fail suite: it is how screens are judged.

Usage: SHOTS=<folder> [SIZES=1536x730,1366x650,1440x900] [SCHEME=dark|light] [ONLY=saved,users] [FULL=1] python3 tests/e2e/screens.py
Env as in the other suites (PG* for the owner connection, BASE_URL, CHROME). Empties the app's tables first.
"""
import hashlib
import os
import secrets
import subprocess
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:3101")
COOKIE = os.environ.get("SESSION_COOKIE", "__Host-distill_session")
SHOTS = os.environ.get("SHOTS", "/tmp/screens")
SIZES = [tuple(int(n) for n in s.split("x")) for s in os.environ.get("SIZES", "1536x730,1366x650,1440x900").split(",")]
SCHEME = os.environ.get("SCHEME", "dark")
FULL = os.environ.get("FULL") == "1"  # whole page (phone sizes scroll as one column)
ONLY = set(filter(None, os.environ.get("ONLY", "").split(",")))
os.makedirs(SHOTS, exist_ok=True)


def sql(q):
    r = subprocess.run(["psql", "-X", "-At", "-v", "ON_ERROR_STOP=1", "-c", q], capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"seed SQL failed: {r.stderr.strip()}")
    return r.stdout.strip()


here = os.path.dirname(os.path.abspath(__file__))
subprocess.run(["psql", "-X", "-q", "-v", "ON_ERROR_STOP=1", "-f", os.path.join(here, "reset.sql")], check=True)


def person(name, username, role="user"):
    return sql(f"insert into users (name, username, email, password_hash, role) values ('{name}', '{username}', "
               f"'{username}@example.com', 'x', '{role}') returning id").splitlines()[0]


owner = person("Kevin Novak", "kevin_n", "owner")
person("Hana Mori", "hana_m", "admin")
person("Lena Schmidt", "lena_s", "moderator")
people = [person(n, u) for n, u in [("Nora Ferreira", "nora_f"), ("Oliver Hart", "oliver_h"), ("Adam Moreau", "adam_m"),
                                     ("Marco Brandt", "marco_b"), ("Elif Aydin", "elif_a"), ("Tomas Berg", "tomas_b"),
                                     ("Julia Weiss", "julia_w"), ("Sven Olsen", "sven_o"), ("Clara Duval", "clara_d"),
                                     ("Mila Novak", "mila_n"), ("Felix Wagner", "felix_w"), ("Ines Costa", "ines_c"),
                                     ("Daniel Ortiz", "daniel_o"), ("Petra Kovac", "petra_k"), ("Lucas Petit", "lucas_p")]]
for i in range(1, 7):
    sql(f"insert into users (name, username, role) values ('Guest {30 + i}', 'guest-{30 + i}', 'guest')")

SUMMARIES = [
    ("Harbor Street rail yard becomes a new district", "medium", "checked", 5, "The council voted 7 to 2 to turn the rail yard into 1,200 homes.", ["7 to 2", "1,200", "$40M"]),
    ("Quarterly churn rose to 4.1% after the price change", "bullets", "checked", 30, "Churn climbed from 2.8% to 4.1% in the quarter.", ["4.1%", "2.8%"]),
    ("Draft lease: notice period and deposit terms", "short", "flagged", 60 * 20, "Either side can end the lease with 60 days' notice.", ["60 days"]),
    ("Why the onboarding flow loses users at step three", "medium", "none", 60 * 26, "Users drop off when asked to connect a calendar first.", []),
    ("Battery recycling plant gets regional approval", "short", "checked", 60 * 50, "The plant will process 20,000 tonnes a year from 2028.", ["20,000", "2028"]),
    ("Library hours extended over the exam weeks", "bullets", "checked", 60 * 70, "Weekday hours run until midnight for three weeks.", ["3 weeks"]),
    ("Supplier audit finds two late payment terms", "medium", "flagged", 60 * 90, "Two suppliers were paid after 45 days.", ["45 days"]),
    ("City budget moves funds to road repairs", "short", "checked", 60 * 110, "Road repairs get an extra $2M this year.", ["$2M"]),
    ("New bike lanes on the river road", "medium", "checked", 60 * 130, "Six kilometres of protected lanes open in spring.", ["6 km"]),
]
for title, length, status, ago, point, figs in SUMMARIES:
    title, point = title.replace("'", "''"), point.replace("'", "''")
    fig = ",".join(f'{{"id": {i + 1}, "value": "{v}", "label": "x", "sourceIds": [1]}}' for i, v in enumerate(figs))
    sql("insert into summaries (user_id, title, source_text, sentences, points, figures, figure_status, length, model,"
        " input_tokens, output_tokens, cost_usd, seconds, words_in, words_out, created_at) values"
        f" ('{owner}', '{title}', '{point}', '[{{\"id\": 1, \"text\": \"{point}\", \"paragraph\": 1}}]',"
        f" '[{{\"id\": 1, \"text\": \"{point}\", \"sourceIds\": [1]}}]', '[{fig}]', '{status}', '{length}', 'claude-haiku-5-5',"
        f" 1200, 160, 0.0002, 2.1, 900, 110, now() - interval '{ago} minutes')")
# Usage and events across people and days, so Overview, Activity and Spend have real shapes.
for n, uid in enumerate(people):
    sql(f"insert into usage_events (user_id, is_guest, input_tokens, output_tokens, cost_usd, recorded, length, words, created_at) "
        f"select '{uid}', false, 1100, 170, 0.0002 + {n} * 0.00001, true, 'medium', 800, now() - (g * interval '7 hours') "
        f"from generate_series(1, {2 + n % 5}) g")
    sql(f"insert into auth_events (user_id, kind, created_at) values ('{uid}', 'signup', now() - interval '{n + 1} days'), "
        f"('{uid}', 'signin', now() - interval '{n} hours')")
sql(f"insert into audit_log (actor_id, action, target_user_id, reason, details) select '{owner}', 'grant_role', id, "
    f"'Runs support', '{{\"role\":\"admin\"}}' from users where username = 'hana_m'")
saved_id = sql(f"select id from summaries where user_id = '{owner}' order by created_at desc limit 1")

token = secrets.token_urlsafe(32)
sql(f"insert into sessions (token_hash, user_id, browser, os) values "
    f"(decode('{hashlib.sha256(token.encode()).hexdigest()}', 'hex'), '{owner}', 'Chrome', 'Windows')")

SCREENS = {
    "distill": "/", "saved": "/saved", "saved-one": f"/saved/{saved_id}",
    "profile": "/profile", "prefs": "/profile?tab=preferences", "security": "/profile?tab=security",
    "overview": "/admin", "users": "/admin?tab=users", "user": "/admin?tab=users&user=nora_f",
    "activity": "/admin?tab=activity", "spend": "/admin?tab=spend", "roles": "/admin?tab=roles",
}
# Anything that scrolls (the page, or a list that should fit), or a list whose last row is hidden below its box.
MEASURE = """() => {
  const out = [];
  const d = document.documentElement;
  if (d.scrollHeight > d.clientHeight + 2) out.push(`page scrolls ${d.scrollHeight - d.clientHeight}px`);
  for (const e of document.querySelectorAll('main *')) {
    const s = getComputedStyle(e);
    if (['auto', 'scroll', 'hidden'].includes(s.overflowY) && e.scrollHeight > e.clientHeight + 2 && e.clientHeight > 40) {
      const name = (e.getAttribute('class') || e.tagName).split(' ').slice(0, 2).join('.');
      out.push(`${s.overflowY === 'hidden' ? 'CUT' : 'scrolls'} ${e.scrollHeight - e.clientHeight}px in ${e.tagName.toLowerCase()}.${name}`);
    }
  }
  return out;
}"""

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get("CHROME") or None)
    for w, h in SIZES:
        ctx = b.new_context(viewport={"width": w, "height": h}, color_scheme=SCHEME, timezone_id="Europe/Istanbul")
        ctx.add_cookies([{"name": COOKIE, "value": token, "domain": "localhost", "path": "/", "secure": True, "httpOnly": True},
                         {"name": "tz", "value": "Europe%2FIstanbul", "domain": "localhost", "path": "/"}])
        pg = ctx.new_page()
        for name, path in SCREENS.items():
            if ONLY and name not in ONLY:
                continue
            pg.goto(BASE + path)
            pg.wait_for_selector("main")
            pg.wait_for_timeout(900)
            if pg.locator("text=Nothing here").count():
                print(f"{w}x{h} {name:10s} 404: the seed is wrong")
                continue
            problems = pg.evaluate(MEASURE)
            pg.screenshot(path=os.path.join(SHOTS, f"{name}-{w}x{h}-{SCHEME}.png"), full_page=FULL)
            print(f"{w}x{h} {name:10s} {'ok' if not problems else '; '.join(problems[:3])}")
        ctx.close()
        # Signed out: sign-in, and the public admin demo (invented data, every tab including Server).
        anon = b.new_context(viewport={"width": w, "height": h}, color_scheme=SCHEME, timezone_id="Europe/Istanbul")
        pg = anon.new_page()
        pg.goto(BASE + "/login")  # also sets the tz and vh cookies before the demo pages
        for name, path in {"login": "/login", **{f"demo-{t}": f"/demo/admin?tab={t}" for t in ["overview", "server", "users", "activity", "spend", "roles"]},
                           "demo-user": "/demo/admin?tab=users&user=noahb"}.items():
            if ONLY and name not in ONLY:
                continue
            pg.goto(BASE + path)
            pg.wait_for_timeout(900)
            problems = pg.evaluate(MEASURE.replace("'main *'", "'body *'"))
            pg.screenshot(path=os.path.join(SHOTS, f"{name}-{w}x{h}-{SCHEME}.png"), full_page=FULL)
            print(f"{w}x{h} {name:10s} {'ok' if not problems else '; '.join(problems[:3])}")
        anon.close()
    b.close()
