"""End-to-end checks for the first-time tour: it opens once by itself, runs on the sample without spending a use,
moves with Next / Back and the keyboard, is saved when finished or skipped, can be replayed from Preferences, ends with
the admin demo, and works on a phone. Env as in distill_e2e.py.
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


def person(name, username):
    return sql(f"insert into users (name, username, email, password_hash, tour_done_at) values ('{name}', '{username}', "
               f"'{username}@example.com', 'x', null) returning id").splitlines()[0]


def device(b, uid, phone=False):
    token = secrets.token_urlsafe(32)
    sql(f"insert into sessions (token_hash, user_id) values (decode('{hashlib.sha256(token.encode()).hexdigest()}', 'hex'), '{uid}')")
    size = {"width": 390, "height": 844} if phone else {"width": 1440, "height": 900}
    ctx = b.new_context(viewport=size, is_mobile=phone, has_touch=phone, color_scheme="dark")
    ctx.add_cookies([{"name": COOKIE, "value": token, "domain": "localhost", "path": "/", "secure": True, "httpOnly": True}])
    return ctx.new_page()


def step(pg):
    return pg.inner_text("[role=dialog] .font-mono").strip()


def tour_done(uid):
    return sql(f"select tour_done_at is not null from users where id = '{uid}'") == "t"


with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get("CHROME") or None)

    # 1. A new account: the tour opens by itself on the first visit, at step 1 of 8.
    kevin = person("Kevin Novak", "kevin_n")
    pg = device(b, kevin)
    pg.goto(BASE + "/")
    pg.wait_for_selector("#tour-title", timeout=10000)
    check("the tour opens by itself the first time", step(pg) == "1 of 8", step(pg))
    check("the spotlight sits on the composer", pg.inner_text("#tour-title") == "Start with any text")

    # 2. Next, Back and the keyboard; the sample result appears without spending a use.
    pg.click("[role=dialog] button:has-text('Next')")
    check("Next goes to step 2", step(pg) == "2 of 8")
    pg.click("[role=dialog] button:has-text('Back')")
    check("Back goes to step 1", step(pg) == "1 of 8")
    pg.keyboard.press("ArrowRight")
    pg.keyboard.press("ArrowRight")
    pg.wait_for_selector("[data-point='1']")
    check("the arrow keys move it, and step 3 shows the sample result", step(pg) == "3 of 8" and pg.locator("[data-point='1']").count() == 1)
    check("the tour spends no use", sql(f"select count(*) from usage_events where user_id = '{kevin}'") == "0")
    check("nothing is saved by the tour", sql(f"select count(*) from summaries where user_id = '{kevin}'") == "0")
    check("the tour isn't marked done half way", not tour_done(kevin))

    # 3. To the end: the last card offers the admin demo; Done saves it, and it doesn't open again.
    for _ in range(5):
        pg.click("[role=dialog] button:has-text('Next')")
    check("step 8 is the owner's side", step(pg) == "8 of 8" and pg.locator("[role=dialog] a:has-text('Open the admin demo')").count() == 1)
    pg.click("[role=dialog] button:has-text('Done')")
    pg.wait_for_selector("#tour-title", state="detached")
    pg.wait_for_timeout(500)
    check("Done saves the tour as seen", tour_done(kevin))
    check("the composer is back, empty", pg.input_value("textarea") == "")
    pg.goto(BASE + "/")
    pg.wait_for_selector("textarea")
    pg.wait_for_timeout(700)
    check("it doesn't open again", pg.locator("#tour-title").count() == 0)

    # 4. Replay from Preferences.
    pg.goto(BASE + "/profile?tab=preferences")
    pg.click("main a:has-text('Take the tour')")
    pg.wait_for_selector("#tour-title", timeout=10000)
    check("Preferences replays the tour", step(pg) == "1 of 8")
    pg.keyboard.press("Escape")
    pg.wait_for_selector("#tour-title", state="detached")
    check("Escape skips it and the address forgets ?tour", "tour=" not in pg.url)

    # 5. Skipping counts as seen; the demo button finishes it and opens the console demo.
    lena = person("Lena Schmidt", "lena_s")
    pl = device(b, lena)
    pl.goto(BASE + "/")
    pl.wait_for_selector("#tour-title")
    pl.click("[role=dialog] button:has-text('Skip tour')")
    pl.wait_for_selector("#tour-title", state="detached")
    pl.wait_for_timeout(500)
    check("Skip saves the tour as seen", tour_done(lena))
    pl.goto(BASE + "/?tour=1")
    pl.wait_for_selector("#tour-title")
    for _ in range(7):
        pl.click("[role=dialog] button:has-text('Next')")
    pl.click("[role=dialog] a:has-text('Open the admin demo')")
    pl.wait_for_url("**/demo/admin**", timeout=10000)
    check("Open the admin demo goes to the demo console", "/demo/admin" in pl.url)

    # 6. A phone: eight steps, the Saved and Profile tabs and More in the bottom bar, nothing wider than the phone.
    nora = person("Nora Ferreira", "nora_f")
    ph = device(b, nora, phone=True)
    ph.goto(BASE + "/")
    ph.wait_for_selector("#tour-title", timeout=10000)
    titles = []
    for i in range(8):
        titles.append(ph.inner_text("#tour-title"))
        if i == 2:
            check("on a phone step 3 shows the quotes", ph.locator("[data-point='1'] [data-quote]").count() >= 1)
        check(f"phone step {i + 1} fits", ph.evaluate("document.documentElement.scrollWidth") <= 390)
        if i < 7:
            ph.click("[role=dialog] button:has-text('Next')")
    check("the phone tour has all eight steps", titles[4] == "Everything is kept" and titles[7] == "See the owner's side", str(titles))
    ph.click("[role=dialog] button:has-text('Done')")
    ph.wait_for_timeout(500)
    check("the phone tour is saved too", tour_done(nora))

    # 7. A guest sees it once as well.
    g = b.new_context(viewport={"width": 1440, "height": 900}).new_page()
    sql("alter table users alter column tour_done_at drop default")
    g.goto(BASE + "/login")
    g.click("text=Try it as a guest")
    g.wait_for_selector("#tour-title", timeout=15000)
    check("a guest gets the tour", step(g) == "1 of 8")
    sql("alter table users alter column tour_done_at set default now()")
    b.close()

passed = sum(ok for _, ok in results)
print(f"\n{passed}/{len(results)} passed")
raise SystemExit(0 if passed == len(results) else 1)
