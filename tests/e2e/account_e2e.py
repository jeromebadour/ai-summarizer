"""End-to-end account checks: a real browser against the built app and a real Postgres.

Env as in auth_e2e.py (BASE_URL, PGHOST / PGPORT / PGUSER / PGDATABASE, CHROME). Run on a fresh database:
python3 tests/e2e/account_e2e.py
"""
import json
import os
import subprocess
from playwright.sync_api import sync_playwright
from outbox import confirm

BASE = os.environ.get("BASE_URL", "http://localhost:3101")
results = []


def check(name, ok, detail=""):
    results.append((name, ok))
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail and not ok else ""))


def sql(q):
    return subprocess.run(["psql", "-X", "-At", "-c", q], capture_output=True, text=True).stdout.strip()


def alert(pg, previous=None):
    pg.wait_for_function(
        """(prev) => { const a = document.querySelector('[role=alert]');
        return a && a.innerText.trim() !== '' && a.innerText !== prev; }""",
        arg=previous,
        timeout=10000,
    )
    return pg.inner_text("[role=alert]")


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
    confirm(pg, email, BASE)
    return ctx, pg


def sign_in(b, identifier, password):
    ctx = b.new_context()
    pg = ctx.new_page()
    pg.goto(BASE + "/login")
    pg.fill("input[name=identifier]", identifier)
    pg.fill("input[name=password]", password)
    pg.click("button[type=submit]")
    pg.wait_for_url(BASE + "/", timeout=15000)
    return ctx, pg


def notice(pg, key):
    """The notice a finished step shows after its redirect (it stays a few seconds, then the address drops the key)."""
    try:
        pg.wait_for_selector(f"[data-notice='{key}']", timeout=8000)
        return True
    except Exception:
        return False


def signed_out(pg, path="/profile"):
    pg.goto(BASE + path)
    pg.wait_for_timeout(1500)
    return pg.url.startswith(BASE + "/login")


with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get("CHROME") or None)

    # 1. Signed-out visitors go to /login; the profile shows the real account.
    ctx0 = b.new_context()
    pg0 = ctx0.new_page()
    check("signed out: /profile goes to /login", signed_out(pg0))
    check("signed out: /saved goes to /login", signed_out(pg0, "/saved"))
    check("signed out: /admin goes to /login", signed_out(pg0, "/admin"))
    ctx0.close()

    a, pa = sign_up(b, "Kevin Novak", "kevin_n", "kevin.n@example.com", "harbor2026")
    pa.goto(BASE + "/profile")
    pa.wait_for_selector("text=Kevin Novak")
    check("profile shows the account", pa.locator("text=@kevin_n").count() > 0 and pa.locator("text=kevin.n@example.com").count() > 0)
    pa.goto(BASE + "/profile?tab=security")
    pa.wait_for_selector("text=This device")
    check("one device, no Sign out others", pa.locator("text=Sign out others").count() == 0)

    # 2. A second and third device; Sign out on one row ends just that one.
    b2, pb = sign_in(b, "kevin_n", "harbor2026")
    c3, pc = sign_in(b, "kevin.n@example.com", "harbor2026")
    pa.goto(BASE + "/profile?tab=security")
    pa.wait_for_selector("text=Sign out others")
    check("three devices listed", pa.locator("text=3 devices").count() == 1)
    pa.locator("li form button").first.click()
    pa.wait_for_selector("text=2 devices", timeout=10000)
    check("a row's Sign out says so", notice(pa, "device-signed-out"))
    check("Sign out on a row ends one session", sql("select count(*) from sessions") == "2")
    gone = [signed_out(pb), signed_out(pc)]
    check("exactly the other device was signed out", sorted(gone) == [False, True], str(gone))
    ended_pg = pb if gone[0] else pc
    check("the signed-out device is told its session ended", notice(ended_pg, "session-ended"))
    keep_ctx, keep_pg = (b2, pb) if not gone[0] else (c3, pc)

    # 3. Sign out others.
    pa.click("text=Sign out others")
    pa.wait_for_selector("[role=alertdialog]:has-text('Sign out the other device?')")
    check("Sign out others asks first", sql("select count(*) from sessions") == "2")
    pa.locator("[role=alertdialog] button:has-text('Sign out others')").click()
    pa.wait_for_selector("text=1 device", timeout=10000)
    check("and then says so", notice(pa, "others-signed-out"))
    check("Sign out others leaves only this device", sql("select count(*) from sessions") == "1" and signed_out(keep_pg))
    check("this device stays signed in", not signed_out(pa, "/profile?tab=security"))

    # 4. Change password: wrong current refused; right one works and can sign the others out.
    d4, pd = sign_in(b, "kevin_n", "harbor2026")
    pa.goto(BASE + "/profile?tab=security&dialog=password")
    pa.fill("input[name=current]", "wrong-pass1")
    pa.fill("input[name=next]", "lantern42x")
    pa.click("button:has-text('Change')")
    t = alert(pa)
    check("wrong current password refused", "wrong" in t, t)
    pa.fill("input[name=current]", "harbor2026")
    pa.click("button:has-text('Change')")
    check("password change says so, others signed out", notice(pa, "password-changed-others"))
    pa.wait_for_url(BASE + "/profile?tab=security", timeout=10000)
    check("password changed, dialog closed", pa.locator("text=Last changed just now").count() == 1)
    check("other device signed out with the change", signed_out(pd))
    ctx = b.new_context()
    pg = ctx.new_page()
    pg.goto(BASE + "/login")
    pg.fill("input[name=identifier]", "kevin_n")
    pg.fill("input[name=password]", "harbor2026")
    pg.click("button[type=submit]")
    check("old password no longer works", "wrong" in alert(pg))
    ctx.close()

    # 5. Edit profile: a name change needs no password; a username change does.
    pa.goto(BASE + "/profile?dialog=edit")
    pa.fill("input[name=name]", "Kevin N.")
    check("name-only change asks no password", pa.locator("input[name=password]").count() == 0)
    pa.click("button:has-text('Save')")
    check("profile save says so", notice(pa, "profile-saved"))
    pa.wait_for_url(BASE + "/profile", timeout=10000)
    pa.wait_for_selector("h2:has-text('Kevin N.')")
    check("name saved", sql("select name from users where username='kevin_n'") == "Kevin N.")
    pa.goto(BASE + "/profile?dialog=edit")
    pa.fill("input[name=username]", "kevin_novak")
    pa.wait_for_selector("text=Available")
    check("username change asks the password", pa.locator("input[name=password]").count() == 1)
    pa.fill("input[name=password]", "not-it-1")
    pa.click("button:has-text('Save')")
    t = alert(pa)
    check("wrong password refuses the username change", "wrong" in t, t)
    pa.fill("input[name=password]", "lantern42x")
    pa.click("button:has-text('Save')")
    pa.wait_for_url(BASE + "/profile", timeout=10000)
    check("username changed", sql("select count(*) from users where username='kevin_novak'") == "1")
    e5, pe = sign_in(b, "kevin_novak", "lantern42x")
    check("sign in with the new username", pe.url == BASE + "/")
    e5.close()

    # 6. Export: the signed-in user's own data; nothing without a session.
    sql(
        "insert into summaries (user_id, title, source_text, sentences, points, length, model, input_tokens, output_tokens,"
        " cost_usd, seconds, words_in, words_out) select id, 'Housing plan', 'private source text', '[]', '[]', 'medium',"
        " 'm', 900, 120, 0.0015, 2.1, 640, 90 from users where username='kevin_novak'"
    )
    r = pa.request.get(BASE + "/api/export")
    data = json.loads(r.text())
    check(
        "export holds the account and its summaries",
        r.status == 200 and data["account"]["username"] == "kevin_novak" and len(data["summaries"]) == 1
        and "attachment" in r.headers.get("content-disposition", ""),
    )
    anon = b.new_context()
    check("export refused without a session", anon.request.get(BASE + "/api/export").status == 401)
    anon.close()

    # 7. Stats come from the real rows.
    pa.goto(BASE + "/profile")
    check("profile counts the real summary", pa.locator("text=640").count() > 0)

    # 8. Guest upgrade in place: same user id, uses stay attached.
    g = b.new_context()
    pgg = g.new_page()
    pgg.goto(BASE + "/login")
    pgg.click("text=Try it as a guest")
    pgg.wait_for_url(BASE + "/", timeout=15000)
    gid = sql("select id from users where role='guest' order by created_at desc limit 1")
    sql(f"insert into usage_events (user_id, is_guest) values ('{gid}', true)")
    pgg.goto(BASE + "/profile")
    check("guests have no Security tab", pgg.locator("text=Security").count() == 0)
    pgg.goto(BASE + "/profile?dialog=keep")
    pgg.fill("input[name=name]", "Oliver Hart")
    pgg.fill("input[name=username]", "oliver_h")
    pgg.wait_for_selector("text=Available")
    pgg.fill("input[name=email]", "oliver.h@example.com")
    pgg.fill("input[name=password]", "river2026x")
    pgg.click("button:has-text('Create account')")
    confirm(pgg, "oliver.h@example.com", BASE)
    row = sql(f"select role || '|' || username from users where id='{gid}'")
    check("guest became a user in place (same id)", row == "user|oliver_h", row)
    check("the guest's uses stayed attached", sql(f"select count(*) from usage_events where user_id='{gid}'") == "1")
    check("upgrade logged", sql(f"select count(*) from auth_events where user_id='{gid}' and kind='upgrade'") == "1")

    # 9. Delete account: needs the username typed; removes the account, its sessions and summaries; keeps the ledger.
    uid = sql("select id from users where username='kevin_novak'")
    sql(f"insert into usage_events (user_id, is_guest, cost_usd, recorded) values ('{uid}', false, 0.0015, true)")
    pa.goto(BASE + "/profile?tab=security&dialog=delete")
    check("Delete waits for the username", pa.locator("button:has-text('Delete account')").last.is_disabled())
    pa.fill("input[name=confirm]", "kevin_novak")
    pa.locator("button:has-text('Delete account')").last.click()
    check("deleting tells you the account is gone", notice(pa, "account-deleted"))
    pa.wait_for_url(BASE + "/login", timeout=15000)
    check("account, sessions and summaries gone",
          sql(f"select (select count(*) from users where id='{uid}') + (select count(*) from sessions where user_id='{uid}')"
              f" + (select count(*) from summaries where user_id='{uid}')") == "0")
    check("the spend ledger keeps the use", sql("select count(*) from usage_events where user_id is null and cost_usd = 0.0015") == "1")
    check("deletion logged with the username", sql("select detail from auth_events where kind='delete'") == "@kevin_novak")

    # 10. Rail sign out ends this session.
    pgg.click("button:has-text('Sign out')")
    pgg.wait_for_selector("[role=alertdialog]:has-text('Sign out of Distill?')")
    check("rail Sign out asks first", sql(f"select count(*) from sessions where user_id='{gid}'") == "1")
    pgg.click("[role=alertdialog] button:has-text('Stay')")
    check("Stay keeps you signed in", pgg.locator("[role=alertdialog]").count() == 0 and sql(f"select count(*) from sessions where user_id='{gid}'") == "1")
    pgg.click("button:has-text('Sign out')")
    pgg.locator("[role=alertdialog] button:has-text('Sign out')").click()
    check("signing out says so", notice(pgg, "signed-out"))
    pgg.wait_for_url(BASE + "/login", timeout=10000)
    check("rail Sign out ends the session", sql(f"select count(*) from sessions where user_id='{gid}'") == "0")

    # 10b. A guest is told what signing out costs, and offered the way to keep the summaries.
    gx = b.new_context()
    pgx = gx.new_page()
    pgx.goto(BASE + "/login")
    pgx.click("text=Try it as a guest")
    pgx.wait_for_url(BASE + "/", timeout=15000)
    pgx.click("button:has-text('Sign out')")
    pgx.wait_for_selector("[role=alertdialog]:has-text('guest account')")
    check("a guest's Sign out offers to keep the summaries", pgx.locator("[role=alertdialog] a:has-text('Keep my summaries')").count() == 1)
    pgx.click("[role=alertdialog] a:has-text('Keep my summaries')")
    pgx.wait_for_selector("input[name=username]", timeout=10000)
    check("Keep my summaries opens the account form", "dialog=keep" in pgx.url)
    gx.close()

    # 11. The console: 404 for non-staff; the owner gets it and has no Delete account.
    u11, pu = sign_in(b, "oliver_h", "river2026x")
    r = pu.goto(BASE + "/admin")
    pu.wait_for_timeout(1500)
    check("non-staff get 404 on /admin", pu.locator("text=404").count() > 0 or (r and r.status == 404))
    sql("update users set role = 'owner' where username = 'oliver_h'")
    pu.goto(BASE + "/admin")
    pu.wait_for_selector("text=Overview", timeout=10000)
    check("the owner opens the console", pu.locator("text=Overview").count() > 0)
    pu.goto(BASE + "/profile?tab=security")
    pu.wait_for_selector("text=This device")
    check("the owner has no Delete account", pu.locator("text=Delete account").count() == 0)
    b.close()

passed = sum(ok for _, ok in results)
print(f"\n{passed}/{len(results)} passed")
raise SystemExit(0 if passed == len(results) else 1)
