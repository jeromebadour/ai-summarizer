"""End-to-end checks for the links to the source: drawn for every point by default, a switch in the Summary header
to show them on hover only, saved to the account (and on Preferences). Env as in distill_e2e.py.
"""
import hashlib
import os
import secrets
import subprocess
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:3101")
COOKIE = os.environ.get("SESSION_COOKIE", "__Host-distill_session")
results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok)))
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail and not ok else ""))


def sql(q):
    r = subprocess.run(["psql", "-X", "-At", "-v", "ON_ERROR_STOP=1", "-c", q], capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"test SQL failed: {r.stderr.strip()}")
    return r.stdout.strip()


uid = sql("insert into users (name, username, email, password_hash) values ('Kevin Novak', 'kevin_n', 'kevin@example.com', 'x') returning id").splitlines()[0]


def device(b):
    token = secrets.token_urlsafe(32)
    sql(f"insert into sessions (token_hash, user_id) values (decode('{hashlib.sha256(token.encode()).hexdigest()}', 'hex'), '{uid}')")
    ctx = b.new_context(viewport={"width": 1536, "height": 730}, color_scheme="dark", timezone_id="Europe/Istanbul")
    ctx.add_cookies([{"name": COOKIE, "value": token, "domain": "localhost", "path": "/", "secure": True, "httpOnly": True},
                     {"name": "tz", "value": "Europe%2FIstanbul", "domain": "localhost", "path": "/"}])
    return ctx.new_page()


def threads(pg):
    return int(pg.get_attribute("svg[data-threads]", "data-threads") or 0)


with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get("CHROME") or None)
    pg = device(b)
    pg.goto(BASE + "/")
    pg.wait_for_selector("textarea")
    pg.click("button:has-text('Sample')")
    check("with text in, the composer offers Distill", pg.locator("[data-composer] button:has-text('Distill')").count() == 1)
    pg.locator("[data-composer] button:has-text('Distill')").click()
    pg.wait_for_selector("text=Links on", timeout=30000)
    pg.mouse.move(5, 5)
    pg.wait_for_timeout(600)
    check("a new account sees every point's links at once", threads(pg) >= 4, str(threads(pg)))
    check("a new account starts in Split", pg.get_attribute("[aria-label='Result view'] button:has-text('Split')", "aria-pressed") == "true")

    pg.click("button:has-text('Links on')")
    pg.wait_for_selector("text=Links on hover")
    pg.wait_for_timeout(600)
    check("the switch saves On hover to the account", sql(f"select links from users where id = '{uid}'") == "hover")
    check("on hover, nothing is drawn until a point is hovered", threads(pg) == 0, str(threads(pg)))
    pg.hover("[data-point='1']")
    pg.wait_for_timeout(400)
    check("hovering a point draws its links", threads(pg) >= 1, str(threads(pg)))

    # Column: one column, each point's sentences quoted under it, no lines; the choice is saved.
    pg.click("[aria-label='Result view'] button:has-text('Column')")
    pg.wait_for_selector("[data-result-column]")
    pg.wait_for_timeout(600)
    check("Column saves to the account", sql(f"select result_view from users where id = '{uid}'") == "column")
    check("Column quotes each point's sentences", pg.locator("[data-point='1'] [data-quote]").count() >= 1)
    check("Column draws no lines", pg.locator("svg[data-threads]").count() == 0)
    check("Column hides the links switch", pg.locator("button:has-text('Links on')").count() == 0)
    check("Column keeps the figures", pg.locator("[data-figure]").count() >= 1)
    check("the source folds to a card with its coverage", pg.locator("[data-source-card] [role=img]").count() == 1)
    pg.click("[data-source-card] button:has-text('Read it')")
    pg.wait_for_selector("[data-source-panel]")
    pg.hover("[data-point='1']")
    pg.wait_for_timeout(300)
    check("Read it opens the text with the point's sentences lit", pg.locator("[data-source-panel] .bg-brand-mark").count() >= 1)
    pg.click("[data-source-panel] button:has-text('Fold')")
    pg.wait_for_selector("[data-source-card]")
    check("Fold closes it again", pg.locator("[data-source-panel]").count() == 0)

    # Another device opens a saved summary with the saved choice; Preferences changes it back.
    other = device(b)
    sid = sql(f"select id from summaries where user_id = '{uid}' limit 1")
    other.goto(f"{BASE}/saved/{sid}")
    other.wait_for_selector("[data-result-column]")
    check("Column follows the account to another device", True)
    other.click("[aria-label='Result view'] button:has-text('Split')")
    other.wait_for_selector("text=Links on hover")
    check("so does On hover", True)
    other.wait_for_timeout(600)
    check("Split from the saved page saves too", sql(f"select result_view from users where id = '{uid}'") == "split")
    other.goto(BASE + "/profile?tab=preferences")
    other.wait_for_selector("text=Links to the source")
    other.click("main button:has-text('Always')")
    other.wait_for_selector("text=Preference saved", timeout=10000)
    check("Preferences sets Always again", sql(f"select links from users where id = '{uid}'") == "always")
    other.click("main button:has-text('Column')")
    other.wait_for_timeout(800)
    check("Preferences sets Column", sql(f"select result_view from users where id = '{uid}'") == "column")
    b.close()

passed = sum(ok for _, ok in results)
print(f"\n{passed}/{len(results)} passed")
raise SystemExit(0 if passed == len(results) else 1)
