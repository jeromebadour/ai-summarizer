"""End-to-end checks at phone size (390 x 844, BUILD-RULES 2.17): the bottom bar and its More sheet, the composer and
the result (always the column on a phone, no switch), Saved, Profile, the console and the public demo, and that no
screen is wider than the phone. Env as in distill_e2e.py.
"""
import hashlib
import os
import secrets
import subprocess
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:3101")
COOKIE = os.environ.get("SESSION_COOKIE", "__Host-distill_session")
W, H = 390, 844
results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok)))
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail and not ok else ""))


def sql(q):
    r = subprocess.run(["psql", "-X", "-At", "-v", "ON_ERROR_STOP=1", "-c", q], capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"test SQL failed: {r.stderr.strip()}")
    return r.stdout.strip()


uid = sql("insert into users (name, username, email, password_hash, role) values ('Kevin Novak', 'kevin_n', 'kevin@example.com', 'x', 'owner') returning id").splitlines()[0]


def phone(b, signed_in=True):
    ctx = b.new_context(viewport={"width": W, "height": H}, is_mobile=True, has_touch=True, color_scheme="dark")
    if signed_in:
        token = secrets.token_urlsafe(32)
        sql(f"insert into sessions (token_hash, user_id) values (decode('{hashlib.sha256(token.encode()).hexdigest()}', 'hex'), '{uid}')")
        ctx.add_cookies([{"name": COOKIE, "value": token, "domain": "localhost", "path": "/", "secure": True, "httpOnly": True}])
    return ctx.new_page()


def fits(pg):
    """Nothing on the page is wider than the phone (a wide table scrolls inside its own card instead)."""
    return pg.evaluate("document.documentElement.scrollWidth") <= W


bar = "nav[aria-label=Places]"

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get("CHROME") or None)
    pg = phone(b)

    # 1. The bottom bar replaces the rail; the composer fits and Distill is within thumb reach.
    pg.goto(BASE + "/")
    pg.wait_for_selector("textarea")
    check("the rail is hidden on a phone", not pg.locator("aside").first.is_visible())
    check("the bottom bar shows Distill, Saved, Admin, Profile and More",
          [t.split()[-1] for t in pg.locator(f"{bar} > *").all_inner_texts()] == ["Distill", "Saved", "Admin", "Profile", "More"],
          str(pg.locator(f"{bar} > *").all_inner_texts()))
    check("the composer screen fits the phone", fits(pg))
    check("the header's Distill button gives way to the composer's", pg.locator("main > div:first-child button:has-text('Distill')").is_hidden())

    # 2. Distill: the result is the column, with quotes and no Split | Column switch.
    pg.click("button:has-text('Sample')")
    pg.locator("[data-composer] button:has-text('Distill')").click()
    pg.wait_for_selector("[data-result-column]", timeout=30000)
    pg.wait_for_timeout(500)
    check("on a phone the result is the column", pg.locator("[data-result-column]").count() == 1)
    check("each point quotes its sentences", pg.locator("[data-point='1'] [data-quote]").count() >= 1)
    check("no layout switch on a phone", pg.locator("[aria-label='Result view']").count() == 0)
    check("no lines drawn on a phone", pg.locator("svg[data-threads]").count() == 0)
    check("the result fits the phone", fits(pg))
    check("the saved choice stays Split for bigger screens", sql(f"select result_view from users where id = '{uid}'") == "split")
    pg.click("[data-source-card] button:has-text('Read it')")
    pg.wait_for_selector("[data-source-panel]")
    check("Read it opens the text on a phone", fits(pg))

    # 3. Saved and the saved summary.
    pg.click(f"{bar} a:has-text('Saved')")
    pg.wait_for_url(BASE + "/saved", timeout=10000)
    pg.wait_for_selector("main li a")
    check("Saved fits the phone", fits(pg))
    pg.locator("main li a").first.click()
    pg.wait_for_selector("[data-result-column]", timeout=10000)
    check("a saved summary opens as the column", fits(pg))

    # 4. Profile: every tab fits; the keyboard shortcuts are not shown on a phone.
    for tab in ["", "?tab=preferences", "?tab=security"]:
        pg.goto(BASE + "/profile" + tab)
        pg.wait_for_selector("main")
        check(f"Profile {tab or 'overview'} fits the phone", fits(pg))
    check("no keyboard shortcuts on a phone", pg.locator("text=Keyboard shortcuts").is_hidden())

    # 5. More: About, the theme and Sign out (which still asks first).
    pg.click(f"{bar} button:has-text('More')")
    pg.wait_for_selector("[role=dialog][aria-label=More]")
    check("More holds About, the theme and Sign out",
          all(pg.locator(f"[aria-label=More] :text('{t}')").count() > 0 for t in ["About Distill", "theme", "Sign out"]))
    before = pg.evaluate("document.documentElement.dataset.theme")
    pg.locator("[aria-label=More] button:has-text('theme')").click()
    check("the theme switches from the sheet", pg.evaluate("document.documentElement.dataset.theme") != before)
    pg.locator("[aria-label=More] button:has-text('Sign out')").click()
    pg.wait_for_selector("[role=alertdialog]:has-text('Sign out of Distill?')")
    check("Sign out asks first on a phone too", pg.locator("[role=alertdialog]").count() == 1)
    pg.click("[role=alertdialog] button:has-text('Stay')")

    # 6. The console: every tab fits; wide tables scroll inside their card.
    for tab in ["overview", "users", "activity", "spend", "roles"]:
        pg.goto(f"{BASE}/admin?tab={tab}")
        pg.wait_for_selector("main")
        check(f"Admin {tab} fits the phone", fits(pg))
    pg.goto(f"{BASE}/admin?tab=users&dialog=grant")
    pg.wait_for_selector("[role=dialog], [role=alertdialog]")
    box = pg.locator("[role=dialog], [role=alertdialog]").first.bounding_box()
    check("a dialog fits the phone", box and box["x"] >= 0 and box["x"] + box["width"] <= W)

    # 7. Signed out: sign-in and the public demo fit, with the demo's own bar.
    out = phone(b, signed_in=False)
    out.goto(BASE + "/login")
    out.wait_for_selector("input[name=identifier]")
    check("sign-in fits the phone", fits(out))
    for page in ["/about", "/privacy", "/terms", "/demo/admin", "/demo/admin?tab=server", "/demo/admin?tab=users"]:
        out.goto(BASE + page)
        out.wait_for_timeout(600)
        check(f"{page} fits the phone", fits(out))
    check("the demo has its own bottom bar", out.locator(f"{bar} :text('Sign in')").count() == 1)
    b.close()

passed = sum(ok for _, ok in results)
print(f"\n{passed}/{len(results)} passed")
raise SystemExit(0 if passed == len(results) else 1)
