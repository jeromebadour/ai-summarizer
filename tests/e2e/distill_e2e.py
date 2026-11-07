"""End-to-end checks for the Distill screen: a real browser, the built app, a real Postgres and the fake Claude.

Run the app with ANTHROPIC_BASE_URL=http://127.0.0.1:4010 ANTHROPIC_API_KEY=test-key, start
tests/e2e/fake_claude.mjs 4010, then: python3 tests/e2e/distill_e2e.py (env as in auth_e2e.py).
SHOTS=<folder> also saves a picture of each state.
"""
import hashlib
import os
import secrets
import subprocess
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:3101")
COOKIE = os.environ.get("SESSION_COOKIE", "__Host-distill_session")
SHOTS = os.environ.get("SHOTS")
results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok)))
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail and not ok else ""))


def sql(q):
    return subprocess.run(["psql", "-X", "-At", "-c", q], capture_output=True, text=True).stdout.strip()


def make_user(username, role="user"):
    token = secrets.token_urlsafe(32)
    digest = hashlib.sha256(token.encode()).hexdigest()
    email = "null" if role == "guest" else f"'{username}@example.com'"
    pw = "null" if role == "guest" else "'x'"
    uid = sql(f"insert into users (name, username, email, password_hash, role) values ('{username}', '{username}', {email}, {pw}, '{role}') returning id").splitlines()[0]
    sql(f"insert into sessions (token_hash, user_id) values (decode('{digest}', 'hex'), '{uid}')")
    return token, uid


def page_for(b, token, scheme="dark"):
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, color_scheme=scheme, timezone_id="Europe/Istanbul")
    ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=BASE)
    # A returning browser: the session, and the time-zone cookie every page sets before first paint.
    ctx.add_cookies([{"name": COOKIE, "value": token, "domain": "localhost", "path": "/", "secure": True, "httpOnly": True},
                     {"name": "tz", "value": "Europe%2FIstanbul", "domain": "localhost", "path": "/"}])
    pg = ctx.new_page()
    pg.goto(BASE + "/")
    pg.wait_for_selector("text=Summary", timeout=15000)
    return pg


def shot(pg, name):
    if SHOTS:
        pg.wait_for_timeout(250)
        pg.screenshot(path=os.path.join(SHOTS, f"distill-{name}.png"))


def distill_button(pg):
    return pg.locator("main button:has-text('Distill'), main button:has-text('Distilling'), main button:has-text('Next at'), main button:has-text('Paused'), main button:has-text('Stopped')").first


with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get("CHROME") or None)
    token, uid = make_user("lena_s")
    pg = page_for(b, token)

    # 1. Editing: an empty text area, the Sample button, the idle summary panel; Distill can't run yet.
    check("empty screen offers the text area and Sample", pg.locator("textarea").count() == 1 and pg.locator("button:has-text('Sample')").count() == 1)
    check("the idle panel says what comes", pg.locator("text=Every number is checked against your text").count() == 1)
    check("Distill can't run on an empty text", distill_button(pg).is_disabled())
    check("no Clear on an empty text", pg.locator("button:has-text('Clear')").count() == 0)
    check("no shortcut hint while Distill can't run", pg.locator("main kbd:has-text('Ctrl')").count() == 1)  # only the idle panel's line
    shot(pg, "01-empty")

    # 2. Sample, then a slow Distill: real stages, points appearing one by one.
    pg.click("button:has-text('Sample')")
    check("Sample fills the text and shows Clear", pg.input_value("textarea").startswith("The city council") and pg.locator("button:has-text('Clear')").count() == 1)
    check("Distill can run now", not distill_button(pg).is_disabled())
    shot(pg, "02-sample-loaded")
    pg.fill("textarea", pg.input_value("textarea") + " SLOW")
    pg.keyboard.press("Control+Enter")
    pg.wait_for_selector("text=Writing points", timeout=10000)
    check("Ctrl+Enter starts it; the stage shows live", True)
    pg.wait_for_selector("text=2 points done", timeout=15000)
    shot(pg, "03-running")
    pg.wait_for_selector("text=Copy", timeout=20000)
    check("the result arrives with its points", pg.locator("text=Building starts next spring and runs in phases over six years.").count() == 1)
    check("a faithful answer is checked, not flagged", pg.locator("text=Not in source").count() == 0 and pg.locator("text=figures checked").count() >= 1)
    check("the status says Saved", pg.locator("[role=status]:has-text('Saved')").count() >= 1)
    check("Open links to the saved summary", (pg.locator("a:has-text('Open')").get_attribute("href") or "").startswith("/saved/"))
    check("the quota ring counted it", pg.locator("text=9 of 10 left this hour").count() == 1)
    shot(pg, "04-result")

    # 3. Copy: the text lands on the clipboard, the button says Copied, then goes back.
    pg.click("button:has-text('Copy')")
    pg.wait_for_selector("button:has-text('Copied')", timeout=3000)
    clip = pg.evaluate("navigator.clipboard.readText()")
    check("Copy puts the title and points on the clipboard", clip.startswith("Harbor Street rail yard becomes a new district\n\n- The council voted 7 to 2"), clip[:80])
    shot(pg, "05-copied")
    pg.wait_for_selector("button:has-text('Copy'):not(:has-text('Copied'))", timeout=4000)
    check("Copied goes back to Copy after 2 s", True)

    # 4. Claude overloaded: a clear failure, not counted, Try again works.
    pg.click("button:has-text('Clear')")
    check("Clear goes back to an empty text", pg.input_value("textarea") == "")
    pg.fill("textarea", "The council approved a plan. It costs $40M. OVERLOADED SLOW")
    pg.click("main button:has-text('Distill')")
    pg.wait_for_selector("text=Claude is overloaded right now", timeout=20000)
    check("an overloaded Claude shows the failure", pg.locator("text=Not counted against your limit").count() == 1)
    check("the use came back on the ring", pg.locator("text=9 of 10 left this hour").count() == 1)
    shot(pg, "06-failed")
    pg.fill("textarea", "x") if pg.locator("textarea").count() else None
    pg.click("button:has-text('Clear')")
    pg.fill("textarea", "The city approved a $40M housing plan on Tuesday. Dr. Ana Weber said 30% of the homes will be affordable.")
    pg.click("main button:has-text('Distill')")
    pg.wait_for_selector("text=Copy", timeout=20000)
    check("after a failure, the next one works", pg.locator("text=8 of 10 left this hour").count() == 1)
    pg.context.close()

    # 5. The hour full: the strip shows on load and Distill says when.
    t2, u2 = make_user("kevin_n")
    sql(f"insert into usage_events (user_id, is_guest, created_at) select '{u2}', false, now() - (g || ' minutes')::interval from generate_series(5, 50, 5) g")
    pg = page_for(b, t2)
    pg.fill("textarea", "Some text to summarize.")
    check("the hour strip shows before anyone presses Distill", pg.locator("text=You've used all 10 for this hour").count() == 1)
    check("Distill says when the next one frees up", "Next at" in distill_button(pg).inner_text() and distill_button(pg).is_disabled())
    check("no shortcut hint while the hour is full", pg.locator("main kbd").count() == 0)
    local = subprocess.run(["date", "-d", "+10 minutes", "+%H:%M"], capture_output=True, text=True, env={**os.environ, "TZ": "Europe/Istanbul"}).stdout.strip()
    check("times show in the viewer's zone", f"Next at {local}" in distill_button(pg).inner_text(), distill_button(pg).inner_text() + " vs " + local)
    shot(pg, "07-hour-full")
    pg.context.close()

    # 6. Everything paused: the stop strip, and Distill can't run.
    t3, u3 = make_user("oliver_h")
    sql("update settings set all_paused_at = now()")
    pg = page_for(b, t3)
    pg.fill("textarea", "Some text to summarize.")
    check("paused: the stop strip shows", pg.locator("text=Summaries are paused right now").count() == 1)
    check("paused: Distill can't run", distill_button(pg).is_disabled())
    shot(pg, "08-paused")
    sql("update settings set all_paused_at = null")
    pg.context.close()

    # 7. A refusal mid-way (paused after the page loaded) keeps the text and shows the strip.
    t4, u4 = make_user("maya_k")
    pg = page_for(b, t4)
    pg.fill("textarea", "Some text to summarize.")
    sql("update settings set all_paused_at = now()")
    pg.click("main button:has-text('Distill')")
    pg.wait_for_selector("text=Summaries are paused right now", timeout=10000)
    check("a refusal keeps the text", pg.input_value("textarea") == "Some text to summarize.")
    sql("update settings set all_paused_at = null")
    pg.context.close()

    # 8. Over 20,000 characters: the counter turns amber and Distill can't run.
    t5, u5 = make_user("noahb")
    pg = page_for(b, t5)
    pg.fill("textarea", "a" * 20001)
    check("over the limit: Distill can't run", distill_button(pg).is_disabled())
    check("over the limit: the counter says so", pg.locator("text=20,001 / 20,000").count() == 1)
    pg.context.close()

    # 9. Light theme pictures of the main states.
    if SHOTS:
        t6, u6 = make_user("ines_t")
        pg = page_for(b, t6, "light")
        pg.evaluate("document.documentElement.dataset.theme='light'")
        shot(pg, "11-empty-light")
        pg.click("button:has-text('Sample')")
        pg.fill("textarea", pg.input_value("textarea") + " SLOW")
        pg.click("main button:has-text('Distill')")
        pg.wait_for_selector("text=Writing points", timeout=10000)
        pg.wait_for_selector("text=2 points done", timeout=15000)
        shot(pg, "12-running-light")
        pg.wait_for_selector("text=Copy", timeout=20000)
        shot(pg, "13-result-light")
    b.close()

passed = sum(ok for _, ok in results)
print(f"\n{passed}/{len(results)} passed")
raise SystemExit(0 if passed == len(results) else 1)
