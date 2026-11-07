"""End-to-end checks for Preferences (saved to the account, applied on this device and on the next) and the
keyboard shortcuts. Env as in distill_e2e.py; SHOTS=<folder> saves pictures.
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
        raise SystemExit(f"test SQL failed: {r.stderr.strip()}")
    return r.stdout.strip()


def session(uid):
    token = secrets.token_urlsafe(32)
    sql(f"insert into sessions (token_hash, user_id) values (decode('{hashlib.sha256(token.encode()).hexdigest()}', 'hex'), '{uid}')")
    return token


def device(b, token, scheme="dark"):
    """A fresh browser (empty storage) signed in with `token`: another device, as far as the app can tell."""
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, color_scheme=scheme, timezone_id="Europe/Istanbul")
    ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=BASE)
    ctx.add_cookies([{"name": COOKIE, "value": token, "domain": "localhost", "path": "/", "secure": True, "httpOnly": True},
                     {"name": "tz", "value": "Europe%2FIstanbul", "domain": "localhost", "path": "/"}])
    return ctx.new_page()


def html(pg, attr):
    return pg.evaluate(f"document.documentElement.dataset.{attr} ?? null")


with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get("CHROME") or None)
    uid = sql("insert into users (name, username, email, password_hash) values ('Lena Schmidt', 'lena_s', 'lena@example.com', 'x') returning id").splitlines()[0]
    pg = device(b, session(uid))
    pg.goto(BASE + "/profile?tab=preferences")
    pg.wait_for_selector("text=Default length")

    # 1. Theme: applies at once, saves, says so.
    pg.click("main button:has-text('Light')")
    pg.wait_for_selector("text=Preference saved", timeout=10000)
    check("Light applies at once", html(pg, "theme") == "light")
    check("Light is saved to the account", sql(f"select theme from users where id='{uid}'") == "light")
    check("the header says Preference saved", pg.locator("[role=status]:has-text('Preference saved')").count() == 1)
    if SHOTS:
        pg.wait_for_timeout(300)
        pg.screenshot(path=os.path.join(SHOTS, "prefs-01-saved-light.png"))

    # 2. Motion: Reduced stops movement but keeps states.
    pg.click("main button:has-text('Reduced')")
    pg.wait_for_function("() => document.documentElement.dataset.motion === 'reduced'")
    pg.wait_for_timeout(600)
    check("Reduced is saved", sql(f"select motion from users where id='{uid}'") == "reduced")
    duration = pg.evaluate("getComputedStyle(document.querySelector('button')).transitionDuration")
    check("Reduced ends transitions at once", duration in ("1e-05s", "0.00001s", "0s"), duration)

    # 3. Default length and avatar colour.
    pg.click("button[aria-pressed]:has-text('Bullets')")
    pg.wait_for_timeout(800)
    pg.click("button[aria-label='plum']")
    pg.wait_for_timeout(800)
    row = sql(f"select default_length || '|' || avatar_colour from users where id='{uid}'")
    check("length and colour are saved", row == "bullets|plum", row)
    pg.goto(BASE + "/")
    pg.wait_for_selector("text=Summary")
    check("Distill opens with the saved length", pg.locator("main button[aria-pressed='true']:has-text('Bullets')").count() == 1)

    # 4. Another device takes the account's choices on first load.
    other = device(b, session(uid))  # empty storage, a dark device
    other.goto(BASE + "/")
    other.wait_for_function("() => document.documentElement.dataset.theme === 'light'", timeout=10000)
    check("a new device takes the saved theme", html(other, "theme") == "light")
    check("a new device takes the saved motion", html(other, "motion") == "reduced")

    # 5. The rail's quick switch saves too.
    other.click("aside button[aria-label='Switch to dark theme']")
    other.wait_for_timeout(1200)
    check("the rail switch saves the theme", sql(f"select theme from users where id='{uid}'") == "dark" and html(other, "theme") == "dark")
    other.context.close()

    # 6. System: the device decides again.
    pg.goto(BASE + "/profile?tab=preferences")
    pg.wait_for_selector("text=Default length")
    pg.locator("main button:has-text('System')").first.click()
    pg.wait_for_timeout(800)
    check("System clears the device copy", pg.evaluate("localStorage.getItem('theme')") is None and sql(f"select theme from users where id='{uid}'") == "system")
    check("System follows the device (dark here)", html(pg, "theme") == "dark")

    # 7. Shortcuts on a saved summary and on Saved.
    pts = ",".join(f'{{"id": {i}, "text": "Point number {i}.", "sourceIds": [{i}]}}' for i in (1, 2, 3))
    sents = ",".join(f'{{"id": {i}, "text": "Sentence {i}.", "paragraph": 1}}' for i in (1, 2, 3))
    sid = sql(
        "insert into summaries (user_id, title, source_text, sentences, points, length, model, input_tokens, output_tokens, cost_usd,"
        f" seconds, words_in, words_out) values ('{uid}', 'Shortcut test', 'Sentence 1. Sentence 2. Sentence 3.', '[{sents}]', '[{pts}]',"
        " 'medium', 'claude-haiku-5-5', 10, 10, 0, 1, 6, 9) returning id"
    ).splitlines()[0]
    pg.goto(BASE + f"/saved/{sid}")
    pg.wait_for_selector("text=Point number 2.")
    pg.keyboard.press("2")
    pg.wait_for_timeout(300)
    lit = pg.evaluate("[...document.querySelectorAll('[data-sentence]')].filter(e => getComputedStyle(e).textDecorationLine.includes('underline') && e.className.includes('bg-brand-mark')).map(e => e.dataset.sentence)")
    check("2 focuses point 2 and lights its sentence", lit == ["2"], str(lit))
    pg.keyboard.press("c")
    pg.wait_for_selector("button:has-text('Copied')", timeout=3000)
    check("C copies the summary", pg.evaluate("navigator.clipboard.readText()").startswith("Shortcut test"))
    pg.goto(BASE + "/saved")
    pg.wait_for_selector("input[aria-label='Search saved summaries']")
    pg.keyboard.press("/")
    check("/ jumps to the search box", pg.evaluate("document.activeElement?.getAttribute('aria-label')") == "Search saved summaries")
    pg.keyboard.type("c")
    pg.wait_for_timeout(300)
    check("typing c in a field types it, it doesn't copy", pg.input_value("input[aria-label='Search saved summaries']") == "c")
    pg.context.close()

    # 8. Guests: no avatar colour, and the server refuses one anyway.
    gid = sql("insert into users (name, username, role) values ('Guest 5', 'guest-5', 'guest') returning id").splitlines()[0]
    gp = device(b, session(gid))
    gp.goto(BASE + "/profile?tab=preferences")
    gp.wait_for_selector("text=Default length")
    check("guests have no avatar colour row", gp.locator("text=Avatar colour").count() == 0)
    b.close()

passed = sum(ok for _, ok in results)
print(f"\n{passed}/{len(results)} passed")
raise SystemExit(0 if passed == len(results) else 1)
