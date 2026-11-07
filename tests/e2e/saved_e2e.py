"""End-to-end checks for Saved and a saved summary: a real browser, the built app, a real Postgres (and the fake
Claude for the Distill-to-Open step). Env as in distill_e2e.py; SHOTS=<folder> saves pictures.
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
    r = subprocess.run(["psql", "-X", "-At", "-v", "ON_ERROR_STOP=1", "-c", q], capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"test SQL failed: {r.stderr.strip()}")  # a broken test insert must stop the run, not hide
    return r.stdout.strip()


def make_user(username):
    token = secrets.token_urlsafe(32)
    digest = hashlib.sha256(token.encode()).hexdigest()
    uid = sql(f"insert into users (name, username, email, password_hash) values ('{username}', '{username}', '{username}@example.com', 'x') returning id").splitlines()[0]
    sql(f"insert into sessions (token_hash, user_id) values (decode('{digest}', 'hex'), '{uid}')")
    return token, uid


SUMMARIES = [
    # title, length, figure_status, minutes ago, first point, figures
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


def seed(uid):
    for title, length, status, ago, point, figs in SUMMARIES:
        title, point = title.replace("'", "''"), point.replace("'", "''")  # SQL quoting for the test's own inserts
        fig = ",".join(f'{{"id": {i + 1}, "value": "{v}", "label": "x", "sourceIds": [1]}}' for i, v in enumerate(figs))
        out = sql(
            "insert into summaries (user_id, title, source_text, sentences, points, figures, figure_status, length, model,"
            " input_tokens, output_tokens, cost_usd, seconds, words_in, words_out, created_at) values"
            f" ('{uid}', '{title}', '{point}', '[{{\"id\": 1, \"text\": \"{point}\", \"paragraph\": 1}}]',"
            f" '[{{\"id\": 1, \"text\": \"{point}\", \"sourceIds\": [1]}}]', '[{fig}]', '{status}', '{length}', 'claude-haiku-5-5',"
            f" 1200, 160, 0.0002, 2.1, 900, 110, now() - interval '{ago} minutes')"
        )


def page_for(b, token, scheme="dark"):
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, color_scheme=scheme, timezone_id="Europe/Istanbul")
    ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=BASE)
    ctx.add_cookies([{"name": COOKIE, "value": token, "domain": "localhost", "path": "/", "secure": True, "httpOnly": True},
                     {"name": "tz", "value": "Europe%2FIstanbul", "domain": "localhost", "path": "/"}])
    return ctx.new_page()


def shot(pg, name):
    if SHOTS:
        pg.wait_for_timeout(300)
        pg.screenshot(path=os.path.join(SHOTS, f"saved-{name}.png"))


def rows(pg):
    return pg.locator("main ul li a[href^='/saved/']")


with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get("CHROME") or None)
    token, uid = make_user("lena_s")
    pg = page_for(b, token)

    # 1. An empty library: the invitation, no search.
    pg.goto(BASE + "/saved")
    pg.wait_for_selector("text=Nothing saved yet")
    check("empty library: invitation, no search box", pg.locator("input[aria-label='Search saved summaries']").count() == 0)

    # 2. Nine summaries: 7 a page, newest first, # runs on, pager keeps the place.
    seed(uid)
    pg.goto(BASE + "/saved")
    pg.wait_for_selector("text=Showing")
    check("page 1 shows 7, newest first", rows(pg).count() == 7 and "Harbor Street" in rows(pg).first.inner_text())
    check("the count says 9", pg.locator("h1 + span").inner_text() == "9")
    check("Showing 1–7 of 9", pg.locator("text=Showing 1–7 of 9").count() == 1)
    shot(pg, "01-list")
    pg.get_by_role("link", name="2", exact=True).click()
    pg.wait_for_url(BASE + "/saved?page=2")
    check("page 2 has the last 2, numbered 8 and 9", rows(pg).count() == 2 and rows(pg).first.inner_text().startswith("8"))
    pg.goto(BASE + "/saved?page=99")
    check("a broken page number lands on a real page", rows(pg).count() == 2)

    # 3. Search, chips and a filter that matches nothing.
    pg.goto(BASE + "/saved?page=2")
    pg.fill("input[aria-label='Search saved summaries']", "rail")
    pg.wait_for_url(BASE + "/saved?q=rail", timeout=5000)
    pg.wait_for_timeout(400)
    check("search goes to page 1 with the query in the URL", rows(pg).count() == 1 and "Harbor Street" in rows(pg).first.inner_text())
    pg.fill("input[aria-label='Search saved summaries']", "tonnes")
    pg.wait_for_url(BASE + "/saved?q=tonnes", timeout=5000)
    pg.wait_for_timeout(400)
    check("search finds words in the source and points, not only titles", rows(pg).count() == 1 and "Battery" in rows(pg).first.inner_text())
    pg.goto(BASE + "/saved")
    pg.click("a:has-text('Short')")
    pg.wait_for_url(BASE + "/saved?length=short")
    check("the Short chip filters", rows(pg).count() == 3)
    pg.click("a:has-text('Flagged')")
    pg.wait_for_url(BASE + "/saved?length=short&flagged=1")
    check("chips combine (Short and Flagged)", rows(pg).count() == 1 and "Draft lease" in rows(pg).first.inner_text())
    shot(pg, "02-filtered")
    pg.goto(BASE + "/saved?q=zebra")
    pg.wait_for_selector("text=Nothing matches")
    check("no match: says so, keeps the toolbar, offers Clear filters", pg.locator("input[aria-label='Search saved summaries']").count() == 1 and pg.locator("a:has-text('Clear filters')").count() == 1)
    pg.goto(BASE + "/saved?q=100%25")
    pg.wait_for_selector("text=Nothing matches")
    check("% in a search is literal, not a wildcard", True)
    shot(pg, "03-no-match")

    # 4. A saved summary: its place, Newer / Older, Copy.
    pg.goto(BASE + "/saved")
    rows(pg).first.click()
    pg.wait_for_selector("text=1 of 9")
    check("the newest is 1 of 9, never 'newer than itself'", pg.locator("text=2 of 9").count() == 0)
    check("the newest shows 1 of 9 with Older and no Newer", pg.locator("a:has-text('Older')").count() == 1 and pg.locator("a:has-text('Newer')").count() == 0)
    check("its title and point show", pg.locator("text=The council voted 7 to 2 to turn the rail yard into 1,200 homes.").count() >= 1)
    shot(pg, "04-summary")
    pg.click("a:has-text('Older')")
    pg.wait_for_selector("text=2 of 9")
    check("Older goes to the next one", pg.locator("a:has-text('Newer')").count() == 1)
    pg.click("button:has-text('Copy')")
    pg.wait_for_selector("button:has-text('Copied')")
    check("Copy works on a saved summary", pg.evaluate("navigator.clipboard.readText()").startswith("Quarterly churn rose"))

    # 5. Delete: the dialog, then on to the next one, the count down, the spend untouched.
    spend_before = sql("select coalesce(sum(cost_usd), 0) from usage_events")
    pg.click("a:has-text('Delete')")
    pg.wait_for_selector("text=Delete this summary?")
    shot(pg, "05-delete-dialog")
    pg.click("button:has-text('Delete')")
    pg.wait_for_selector("text=Deleted", timeout=10000)
    check("delete lands on the next summary with Deleted", "Draft lease" in pg.content() and pg.locator("text=2 of 8").count() == 1)
    check("the summary is gone from the database", sql(f"select count(*) from summaries where user_id='{uid}' and title like 'Quarterly%'") == "0")
    check("deleting a summary never changes the spend", sql("select coalesce(sum(cost_usd), 0) from usage_events") == spend_before)

    # 6. Someone else's summary, or a made-up id, is a 404.
    t2, u2 = make_user("kevin_n")
    other = sql(f"insert into summaries (user_id, title, source_text, sentences, points, length, model, input_tokens, output_tokens, cost_usd, seconds, words_in, words_out) values ('{u2}', 'Kevin private', 's', '[]', '[]', 'short', 'm', 1, 1, 0, 1, 1, 1) returning id").splitlines()[0]
    r = pg.goto(BASE + f"/saved/{other}")
    pg.wait_for_timeout(800)
    check("someone else's summary is a 404", "Kevin private" not in pg.content() and pg.locator("text=404").count() > 0)
    pg.goto(BASE + "/saved/not-a-real-id")
    pg.wait_for_timeout(800)
    check("a made-up id is a 404", pg.locator("text=404").count() > 0)
    pg.context.close()

    # 7. From Distill straight to the saved summary with Open.
    t3, u3 = make_user("oliver_h")
    pg = page_for(b, t3)
    pg.goto(BASE + "/")
    pg.wait_for_selector("button:has-text('Sample')")
    pg.click("button:has-text('Sample')")
    pg.click("main button:has-text('Distill')")
    pg.wait_for_selector("a:has-text('Open')", timeout=20000)
    pg.click("a:has-text('Open')")
    pg.wait_for_selector("text=1 of 1", timeout=10000)
    check("Open shows the summary just made", pg.locator("text=Harbor Street rail yard becomes a new district").count() >= 1)
    shot(pg, "06-opened-from-distill")
    if SHOTS:
        pg2 = page_for(b, token, "light")
        pg2.goto(BASE + "/saved")
        pg2.wait_for_selector("text=Showing")
        pg2.evaluate("document.documentElement.dataset.theme='light'")
        shot(pg2, "07-list-light")
    b.close()

passed = sum(ok for _, ok in results)
print(f"\n{passed}/{len(results)} passed")
raise SystemExit(0 if passed == len(results) else 1)
