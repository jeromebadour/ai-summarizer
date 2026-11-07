"""End-to-end sign-in checks: a real browser against the built app and a real Postgres.

Env: BASE_URL (default http://localhost:3101), PGHOST / PGPORT / PGUSER / PGDATABASE for the owner connection that
checks and arranges rows, CHROME (path to Chrome). Run on a fresh database: python3 tests/e2e/auth_e2e.py
"""
import os
import subprocess
import re
from playwright.sync_api import sync_playwright
from outbox import confirm

BASE = os.environ.get("BASE_URL", "http://localhost:3101")
results = []

def check(name, ok, detail=""):
    results.append((name, ok))
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail and not ok else ""))

def sql(q):
    return subprocess.run(["psql", "-X", "-At", "-c", q],
                          capture_output=True, text=True).stdout.strip()

def alert(pg, previous=None):
    """The alert's text once it is shown and (if given) different from the previous one."""
    pg.wait_for_function("""(prev) => { const a = document.querySelector('[role=alert]');
        return a && a.innerText.trim() !== '' && a.innerText !== prev; }""", arg=previous, timeout=10000)
    return pg.inner_text("[role=alert]")

def session_cookie(ctx):
    return next((c for c in ctx.cookies() if c["name"] in ("distill_session", "__Host-distill_session")), None)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get("CHROME") or None)

    # 1. Sign up
    ctx = b.new_context(); pg = ctx.new_page()
    pg.goto(BASE + "/login?mode=signup")
    pg.fill("input[name=name]", "Lena Schmidt")
    pg.fill("input[name=username]", "Lena_S")
    pg.wait_for_selector("text=Available", timeout=5000)
    check("username shows Available from the server", True)
    pg.fill("input[name=email]", "Lena.S@example.com")
    pg.fill("input[name=password]", "harbor2026")
    pg.click("button[type=submit]")
    pg.wait_for_url(BASE + "/verify", timeout=15000)
    check("sign-up lands on Check your inbox", pg.url == BASE + "/verify")
    check("a new account starts unconfirmed", sql("select email_verified_at is null from users where username='lena_s'") == "t")
    confirm(pg, "lena.s@example.com", BASE)
    check("the code from the email confirms it and opens Distill", pg.url == BASE + "/")
    c = session_cookie(ctx)
    check("session cookie is __Host-, httpOnly, Secure, SameSite=Lax", bool(c and c["name"].startswith("__Host-") and c["httpOnly"] and c["secure"] and c["sameSite"] == "Lax"), str(c))
    row = sql("select username, email, left(password_hash, 9), role from users where username='lena_s'")
    check("stored lowercase, argon2id, role user", row == "lena_s|lena.s@example.com|$argon2id|user", row)
    check("only the token's hash is stored", sql("select count(*) from sessions where token_hash = sha256(convert_to('%s','utf8'))" % c["value"]) == "1")
    check("raw token not in the database", sql("select count(*) from sessions where encode(token_hash,'escape') like '%%%s%%'" % c["value"][:10]) == "0")
    pg.goto(BASE + "/login")
    pg.wait_for_url(BASE + "/", timeout=10000)
    check("a signed-in visit to /login goes to /", pg.url == BASE + "/")
    ctx.close()

    # 2. Taken username and email
    ctx = b.new_context(); pg = ctx.new_page()
    pg.goto(BASE + "/login?mode=signup")
    pg.fill("input[name=username]", "lena_s")
    pg.wait_for_selector("text=Taken", timeout=5000)
    check("a taken username shows Taken", True)
    pg.fill("input[name=name]", "Someone")
    pg.fill("input[name=username]", "someone_else")
    pg.fill("input[name=email]", "lena.s@example.com")
    pg.fill("input[name=password]", "river2026x")
    pg.click("button[type=submit]")
    t = alert(pg)
    check("a used email is refused", t.startswith("An account with this email already exists."), t)
    pg.click("text=Sign in instead")
    check("Sign in instead opens Sign in with the email filled in",
          pg.input_value("input[name=identifier]") == "lena.s@example.com" and pg.input_value("input[name=password]") == "")
    ctx.close()

    # 3. Sign in by username, wrong password, unknown account
    ctx = b.new_context(); pg = ctx.new_page()
    pg.goto(BASE + "/login")
    pg.fill("input[name=identifier]", "lena_s"); pg.fill("input[name=password]", "wrong-pass1")
    pg.click("button[type=submit]"); wrong = alert(pg)
    pg.fill("input[name=identifier]", "nobody_here"); pg.fill("input[name=password]", "wrong-pass1")
    pg.click("button[type=submit]"); pg.wait_for_function("() => !document.querySelector('button[type=submit]').disabled"); pg.wait_for_timeout(300)
    unknown = pg.inner_text("[role=alert]")
    check("wrong password and unknown account read the same", wrong == unknown, f"{wrong!r} vs {unknown!r}")
    check("the failed attempt is logged", sql("select count(*) from auth_events where kind='signin_failed'") == "1")
    pg.fill("input[name=identifier]", "@Lena_S"); pg.fill("input[name=password]", "harbor2026")
    pg.click("button[type=submit]"); pg.wait_for_url(BASE + "/", timeout=15000)
    check("sign-in by @Username (any case) works", pg.url == BASE + "/")
    ctx.close()

    # 4. Sign in by email
    ctx = b.new_context(); pg = ctx.new_page()
    pg.goto(BASE + "/login")
    pg.fill("input[name=identifier]", "LENA.S@example.com"); pg.fill("input[name=password]", "harbor2026")
    pg.click("button[type=submit]"); pg.wait_for_url(BASE + "/", timeout=15000)
    check("sign-in by email works", pg.url == BASE + "/")
    check("each sign-in is its own session", sql("select count(*) from sessions") == "3")
    ctx.close()

    # 5. Guest
    ctx = b.new_context(); pg = ctx.new_page()
    pg.goto(BASE + "/login")
    pg.click("text=Try it as a guest"); pg.wait_for_url(BASE + "/", timeout=15000)
    check("guest lands on /", pg.url == BASE + "/")
    g = sql("select name || '|' || username || '|' || role from users where role='guest'")
    m = re.fullmatch(r"Guest (\d+)\|guest-(\d+)\|guest", g)
    check("guest row named by the database", bool(m and m.group(1) == m.group(2)), g)
    ctx.close()

    # 6. Throttle: 10 failures lock sign-in for 15 minutes, even with the right password
    sql("insert into auth_events (user_id, kind) select id, 'signin_failed' from users, generate_series(1, 9) where username='lena_s'")
    ctx = b.new_context(); pg = ctx.new_page()
    pg.goto(BASE + "/login")
    pg.fill("input[name=identifier]", "lena_s"); pg.fill("input[name=password]", "harbor2026")
    pg.click("button[type=submit]"); t = alert(pg)
    check("10 failures in 15 minutes stop even the right password", "Too many tries" in t, t)
    sql("delete from auth_events where kind='signin_failed'")

    # 7. Suspended: refused, but only after the right password
    sql("update users set suspended_at = now() where username='lena_s'")
    pg.fill("input[name=password]", "nope-nope1"); pg.click("button[type=submit]"); t1 = alert(pg, t)
    check("suspension not revealed to a wrong password", "suspended" not in t1, t1)
    pg.fill("input[name=password]", "harbor2026"); pg.click("button[type=submit]"); t2 = alert(pg, t1)
    check("suspended account told so after the right password", "suspended" in t2, t2)
    sql("update users set suspended_at = null where username='lena_s'")
    ctx.close()

    # 8. A forged cookie gets nothing
    ctx = b.new_context()
    ctx.add_cookies([{"name": "__Host-distill_session", "value": "forged-token-value", "domain": "localhost", "path": "/", "secure": True}])
    pg = ctx.new_page(); pg.goto(BASE + "/login"); pg.wait_for_timeout(2500)
    check("a forged cookie is not a session", pg.url.startswith(BASE + "/login") and pg.locator("input[name=identifier]").count() == 1)
    ctx.close()
    b.close()

passed = sum(ok for _, ok in results)
print(f"\n{passed}/{len(results)} passed")
raise SystemExit(0 if passed == len(results) else 1)
