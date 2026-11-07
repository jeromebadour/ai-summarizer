"""End-to-end checks for confirming an email and setting a new password (migration 012): a real browser, the built
app, a real Postgres, and the emails the app writes to EMAIL_OUTBOX (tests/e2e/outbox.py). Env as in auth_e2e.py.
SHOTS=<folder> also saves a picture of each step.
"""
import os
import subprocess
import time
from playwright.sync_api import sync_playwright
from outbox import code_of, confirm, emails_to, link_of, newest

BASE = os.environ.get("BASE_URL", "http://localhost:3101")
SHOTS = os.environ.get("SHOTS")
results = []


def check(name, ok, detail=""):
    results.append((name, ok))
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if not ok and detail else ""))


def sql(q):
    r = subprocess.run(["psql", "-X", "-At", "-v", "ON_ERROR_STOP=1", "-c", q], capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"test SQL failed: {r.stderr.strip()}")
    return r.stdout.strip()


def shot(pg, name):
    if SHOTS:
        pg.screenshot(path=os.path.join(SHOTS, f"email-{name}.png"))


def alert(pg):
    # Inside the form: Next keeps its own (empty) route announcer with role=alert on every page.
    pg.wait_for_selector("form [role=alert]", timeout=10000)
    return pg.inner_text("form [role=alert]")


def sign_up(b, name, username, email, password):
    ctx = b.new_context()
    pg = ctx.new_page()
    pg.goto(BASE + "/login?mode=signup")
    pg.fill("input[name=name]", name)
    pg.fill("input[name=username]", username)
    pg.wait_for_selector("text=Available")
    pg.fill("input[name=email]", email)
    pg.fill("input[name=password]", password)
    pg.click("button[type=submit]")
    pg.wait_for_url(BASE + "/verify", timeout=15000)
    return ctx, pg


def sign_in(b, identifier, password):
    ctx = b.new_context()
    pg = ctx.new_page()
    pg.goto(BASE + "/login")
    pg.fill("input[name=identifier]", identifier)
    pg.fill("input[name=password]", password)
    pg.click("button[type=submit]")
    pg.wait_for_load_state("networkidle")
    return ctx, pg


with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get("CHROME") or None)

    # 1. Sign-up waits on Check your inbox; nothing else opens, and the API refuses, until the email is confirmed.
    ctx, pg = sign_up(b, "Maya Klein", "maya_k", "Maya@Example.com", "harbor2026")
    pg.wait_for_selector("text=Check your inbox")
    check("sign-up shows Check your inbox with the address", "maya@example.com" in pg.inner_text("main") if pg.locator("main").count() else "maya@example.com" in pg.content())
    shot(pg, "01-inbox")
    for path in ["/", "/saved", "/profile"]:
        pg.goto(BASE + path)
        pg.wait_for_url(BASE + "/verify", timeout=10000)
    check("every page sends an unconfirmed account back to Check your inbox", pg.url == BASE + "/verify")
    r = pg.request.post(BASE + "/api/summarize", data={"text": "One. Two.", "length": "short"}, headers={"content-type": "application/json"})
    check("the summary API refuses an unconfirmed account", r.status == 403, str(r.status))

    # 2. The email: from Distill, the code in the subject and in the box, the button's link, a plain-text twin.
    mail = newest("maya@example.com")
    code = code_of(mail)
    link = link_of(mail)
    check("the email comes from Distill", mail["from"].startswith("Distill <"), mail["from"])
    check("the subject starts with the code", mail["subject"] == f"{code} is your Distill code", mail["subject"])
    check("the code box and the button are in the email", f"{code[:3]} {code[3:]}" in mail["html"] and link.replace("&", "&amp;") in mail["html"])
    check("the link points at this site's confirm page", link.startswith(BASE + "/verify/confirm?token="), link)
    check("the email has the footer", all(w in mail["html"] for w in ["/privacy", "/terms", "privacy@jeromebadour.com", "Jerome Badour"]))
    check("only hashes are stored", sql(f"select count(*) from email_tokens where code_hash = sha256('{code}'::bytea)") == "1"
          and sql(f"select count(*) from email_tokens where encode(link_hash, 'escape') like '%{link[-12:]}%'") == "0")

    # 3. A wrong code says so; Send a new code waits a minute and says so.
    wrong = "000000" if code != "000000" else "111111"
    pg.locator("input[aria-label='Digit 1 of 6']").fill(wrong)
    pg.click("button:has-text('Verify email')")
    t = alert(pg)
    check("a wrong code is refused", "doesn't match" in t, t)
    shot(pg, "02-wrong-code")
    resend = pg.locator("button:has-text('Send a new code in')")
    check("Send a new code waits and shows the countdown", resend.count() == 1 and resend.is_disabled())

    # 4. The link. Simply opening it (as a mail scanner does) confirms nothing.
    other = b.new_context()
    other.request.get(link)
    check("opening the link without the page's own step confirms nothing",
          sql("select email_verified_at is null from users where username = 'maya_k'") == "t")
    # Clicked in another browser: it confirms, signs in there, and opens Distill.
    pg2 = other.new_page()
    pg2.goto(link)
    pg2.wait_for_url(BASE + "/", timeout=15000)
    check("the link confirms and signs in where it was opened", pg2.url == BASE + "/")
    check("the account is confirmed", sql("select email_verified_at is not null from users where username = 'maya_k'") == "t")
    # The tab still on Check your inbox notices by itself.
    pg.wait_for_url(BASE + "/", timeout=15000)
    check("the waiting tab moves on to Distill by itself", pg.url == BASE + "/")
    # The same link again: run out.
    pg3 = b.new_context().new_page()
    pg3.goto(link)
    pg3.wait_for_selector("text=This link has run out", timeout=15000)
    check("a used link says it has run out", True)
    shot(pg3, "03-link-ran-out")
    ctx.close()
    other.close()

    # 5. Forgot password. An unknown email gets the same answer, and no email goes out.
    sql("delete from email_tokens")
    fx = b.new_context()
    pf = fx.new_page()
    pf.goto(BASE + "/forgot")
    pf.fill("input[name=email]", "nobody@example.com")
    pf.click("button:has-text('Send the code')")
    pf.wait_for_url(BASE + "/forgot?sent=1", timeout=10000)
    step = lambda pg: pg.locator("section").last.inner_text()  # the right side: the step itself
    unknown_text = step(pf)
    time.sleep(1)
    check("an unknown email: Check your inbox, and no email", "Check your inbox" in unknown_text and not emails_to("nobody@example.com"))

    # A known one: the same screen, and the email.
    elsewhere, pe = sign_in(b, "maya_k", "harbor2026")
    check("another device is signed in before the reset", pe.url == BASE + "/")
    pf.goto(BASE + "/forgot")
    pf.fill("input[name=email]", "maya@example.com")
    pf.click("button:has-text('Send the code')")
    pf.wait_for_url(BASE + "/forgot?sent=1", timeout=10000)
    check("a known email gets the same screen", step(pf) == unknown_text)
    shot(pf, "04-forgot-sent")
    reset_mail = newest("maya@example.com", after=1)
    check("the reset email names its purpose", "reset your Distill password" in reset_mail["subject"], reset_mail["subject"])
    rcode = code_of(reset_mail)
    rlink = link_of(reset_mail)
    pf.locator("input[aria-label='Digit 1 of 6']").fill("000000" if rcode != "000000" else "111111")
    pf.click("button:has-text('Continue')")
    t = alert(pf)
    check("a wrong reset code is refused", "doesn't match" in t, t)
    pf.locator("input[aria-label='Digit 1 of 6']").fill(rcode)
    pf.click("button:has-text('Continue')")
    pf.wait_for_url(BASE + "/reset?token=*", timeout=10000)
    pf.wait_for_selector("text=Set a new password")
    check("the code opens Set a new password for the account", "maya@example.com" in pf.inner_text("body"))
    pf.fill("input[name=password]", "short")
    pf.click("button:has-text('Save and sign in')")
    t = alert(pf)
    check("a weak new password is refused", bool(t), t)
    pf.fill("input[name=password]", "lantern42x")
    shot(pf, "05-set-password")
    pf.click("button:has-text('Save and sign in')")
    pf.wait_for_url(BASE + "/", timeout=15000)
    check("saving signs in here and opens Distill", pf.url == BASE + "/")
    pe.goto(BASE + "/profile")
    pe.wait_for_url(BASE + "/login", timeout=10000)
    check("every other device was signed out", pe.url == BASE + "/login")
    elsewhere.close()
    _, po = sign_in(b, "maya_k", "harbor2026")
    check("the old password no longer works", po.url == BASE + "/login")
    _, pn = sign_in(b, "maya_k", "lantern42x")
    check("the new password works", pn.url == BASE + "/")
    # The emailed link was swapped out when the code was used.
    pz = b.new_context().new_page()
    pz.goto(rlink)
    pz.wait_for_selector("text=This link has run out")
    check("the emailed link stops working once the code is used", True)

    # The reset link on its own works too.
    fy = b.new_context()
    py = fy.new_page()
    py.goto(BASE + "/forgot")
    py.fill("input[name=email]", "maya@example.com")
    py.click("button:has-text('Send the code')")
    py.wait_for_url(BASE + "/forgot?sent=1", timeout=10000)
    link2 = link_of(newest("maya@example.com", after=2))
    pl = b.new_context().new_page()
    pl.goto(link2)
    pl.wait_for_selector("text=Set a new password")
    pl.fill("input[name=password]", "meadow77y")
    pl.click("button:has-text('Save and sign in')")
    pl.wait_for_url(BASE + "/", timeout=15000)
    check("the reset link sets a new password and signs in", pl.url == BASE + "/")

    # 6. Changing the email: the account keeps its current one until the new one is confirmed. (pl: the browser the
    # last reset signed in; that reset signed every other one out.)
    pl.goto(BASE + "/profile?dialog=edit")
    pl.fill("input[name=email]", "maya.k@example.com")
    pl.fill("input[name=password]", "meadow77y")
    pl.click("button:has-text('Save')")
    pl.wait_for_url(BASE + "/verify", timeout=15000)
    row = sql("select email || '|' || pending_email from users where username = 'maya_k'")
    check("a new email waits; the current one stays", row == "maya@example.com|maya.k@example.com", row)
    inbox = pl.locator("section", has=pl.locator("h1:has-text('Check your inbox')"))
    inbox.wait_for()
    check("the code goes to the new address", "maya.k@example.com" in inbox.inner_text() and bool(newest("maya.k@example.com")), inbox.inner_text()[:200])
    check("the way back keeps the current email", pl.locator("button:has-text('Keep my current email')").count() == 1)
    shot(pl, "06-change")
    confirm(pl, "maya.k@example.com", BASE, then="/profile")
    check("the code applies the new email", sql("select email || '|' || coalesce(pending_email, '-') from users where username = 'maya_k'") == "maya.k@example.com|-")
    pl.goto(BASE + "/profile?dialog=edit")
    pl.fill("input[name=email]", "maya.third@example.com")
    pl.fill("input[name=password]", "meadow77y")
    pl.click("button:has-text('Save')")
    pl.wait_for_url(BASE + "/verify", timeout=15000)
    pl.click("button:has-text('Keep my current email')")
    pl.wait_for_url(BASE + "/profile", timeout=10000)
    check("Keep my current email drops the change", sql("select email || '|' || coalesce(pending_email, '-') from users where username = 'maya_k'") == "maya.k@example.com|-")

    b.close()

passed = sum(ok for _, ok in results)
print(f"\n{passed}/{len(results)} passed")
raise SystemExit(0 if passed == len(results) else 1)
