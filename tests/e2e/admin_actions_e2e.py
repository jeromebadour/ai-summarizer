"""End-to-end checks for the admin console's staff actions (step 2): suspend and restore, sign out everywhere, reset
limit, roles, caps and the brakes. Each one only for the roles that hold it, only on people below the viewer, with a
reason, landing in the audit log, and the header saying what was done. Env as in distill_e2e.py; SHOTS=<folder> saves
pictures. Wipes the test database's users first.
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
    sql(f"insert into sessions (token_hash, user_id, browser, os) values "
        f"(decode('{hashlib.sha256(token.encode()).hexdigest()}', 'hex'), '{uid}', 'Firefox', 'Windows')")
    return token


def device(b, token=None):
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, color_scheme="dark", timezone_id="Europe/Istanbul")
    cookies = [{"name": "tz", "value": "Europe%2FIstanbul", "domain": "localhost", "path": "/"}]
    if token:
        cookies.append({"name": COOKIE, "value": token, "domain": "localhost", "path": "/", "secure": True, "httpOnly": True})
    ctx.add_cookies(cookies)
    return ctx.new_page()


def shot(pg, name):
    if SHOTS:
        pg.wait_for_timeout(300)
        pg.screenshot(path=os.path.join(SHOTS, f"actions-{name}.png"))


def dialog(pg):
    return pg.locator("[role=dialog], [role=alertdialog]")


def actions(pg):
    """The action buttons on a user's page (links that open a dialog)."""
    return [t.strip() for t in pg.locator("main section").first.locator("a[href*='dialog=']").all_inner_texts()]


def header(pg):
    return pg.locator("main [role=status]").first.inner_text()


def confirm(pg, label, reason):
    """Types a reason and confirms; returns once the dialog has gone (or an answer shows in it)."""
    button = dialog(pg).locator(f"button[type=submit]:has-text('{label}')")
    check(f"{label}: confirm waits for a reason", button.is_disabled())
    pg.fill("input[name=reason]", reason)
    button.click()


sql("delete from usage_events; delete from audit_log; delete from auth_events; delete from request_errors; "
    "delete from summaries; delete from sessions; update users set role = 'user' where role = 'owner'; delete from users; "
    "update settings set monthly_cap_usd = 40, daily_cap_usd = 3, workspace_cap_usd = 50, guests_paused_at = null, all_paused_at = null")


def person(name, username, role):
    return sql(f"insert into users (name, username, email, password_hash, role) values ('{name}', '{username}', "
               f"'{username}@example.com', 'x', '{role}') returning id").splitlines()[0]


owner = person("Jerome Badour", "jerome", "owner")
admin = person("Hana Mori", "hana_m", "admin")
mod = person("Lena Schmidt", "lena_s", "moderator")
mod2 = person("Paul Weber", "paul_w", "moderator")
kevin = person("Kevin Novak", "kevin_n", "user")
nora = person("Nora Ferreira", "nora_f", "user")
sql("insert into users (name, username, role) values ('Guest 9', 'guest-9', 'guest')")
sql(f"insert into usage_events (user_id, is_guest, cost_usd, recorded, length, words) values "
    f"('{kevin}', false, 0.0004, true, 'medium', 800), ('{kevin}', false, 0.0003, true, 'short', 600)")

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get("CHROME") or None)
    kevin_pg = device(b, session(kevin))
    session(kevin)

    # 1. Who sees which actions, and on whom.
    mpg = device(b, session(mod))
    mpg.goto(BASE + "/admin?tab=users&user=kevin_n")
    mpg.wait_for_selector("text=Kevin Novak")
    got = actions(mpg)
    check("a moderator sees Sign out everywhere and Suspend, nothing more", got == ["Sign out everywhere", "Suspend"], str(got))
    mpg.goto(BASE + "/admin?tab=users&user=paul_w")
    mpg.wait_for_selector("text=Paul Weber")
    check("a moderator has no actions on another moderator", actions(mpg) == [], str(actions(mpg)))
    mpg.goto(BASE + "/admin?tab=users&user=paul_w&dialog=suspend")
    mpg.wait_for_selector("text=Paul Weber")
    check("a typed-in dialog on a peer stays closed", dialog(mpg).count() == 0)
    mpg.goto(BASE + "/admin?tab=users&user=kevin_n&dialog=reset")
    mpg.wait_for_selector("text=Kevin Novak")
    check("a moderator can't open Reset limit", dialog(mpg).count() == 0)

    opg = device(b, session(owner))
    opg.goto(BASE + "/admin?tab=users&user=jerome")
    opg.wait_for_selector("h2:has-text('Jerome Badour')")
    check("nobody has actions on their own page", actions(opg) == [])
    apg = device(b, session(admin))
    apg.goto(BASE + "/admin?tab=users&user=jerome")
    apg.wait_for_selector("h2:has-text('Jerome Badour')")
    check("nobody has actions on the owner", actions(apg) == [])
    apg.goto(BASE + "/admin?tab=users&user=kevin_n")
    apg.wait_for_selector("text=Kevin Novak")
    got = actions(apg)
    check("an admin also resets limits, but changes no roles", got == ["Reset limit", "Sign out everywhere", "Suspend"], str(got))

    # 2. A moderator suspends Kevin: signed out at once, logged with the reason.
    mpg.goto(BASE + "/admin?tab=users&user=kevin_n")
    mpg.click("main a:has-text('Suspend')")
    mpg.wait_for_selector("[role=alertdialog]:has-text('Suspend Kevin Novak?')")
    check("the dialog's address can be linked", "dialog=suspend" in mpg.url)
    check("the live dialog starts with an empty reason", mpg.input_value("input[name=reason]") == "")
    shot(mpg, "01-suspend")
    confirm(mpg, "Suspend", "Posting spam through shared links")
    mpg.wait_for_url(lambda u: "dialog=" not in u and "done=suspend" in u, timeout=15000)
    mpg.wait_for_selector("main span:has-text('Suspended')")
    check("the header says who was suspended", "Suspended @kevin_n" in header(mpg), header(mpg))
    shot(mpg, "02-suspended")
    row = sql(f"select (suspended_at is not null) || '|' || suspended_reason || '|' || (select count(*) from sessions where user_id = '{kevin}') from users where id = '{kevin}'")
    check("Kevin is suspended with the reason, and signed out", row == "true|Posting spam through shared links|0", row)
    audit = sql("select action || '|' || reason || '|' || (details->>'devices') from audit_log")
    check("one audit row, with the reason and the devices", audit == "suspend|Posting spam through shared links|2", audit)
    kevin_pg.goto(BASE + "/")
    kevin_pg.wait_for_url("**/login**", timeout=10000)
    check("Kevin's own browser is signed out", "/login" in kevin_pg.url)

    # 3. Restore shows who suspended and why.
    mpg.click("main a:has-text('Restore')")
    mpg.wait_for_selector("[role=dialog]:has-text('Restore Kevin Novak?')")
    restore_text = dialog(mpg).inner_text()
    check("Restore says who suspended and why", "@lena_s" in restore_text and "Posting spam through shared links" in restore_text, restore_text)
    shot(mpg, "03-restore")
    confirm(mpg, "Restore", "Appeal accepted")
    mpg.wait_for_url(lambda u: "done=restore" in u, timeout=15000)
    check("Kevin is restored", sql(f"select suspended_at is null from users where id = '{kevin}'") == "t")

    # 4. "Nothing changed" is a calm answer, not a problem: someone else got there first.
    mpg.goto(BASE + "/admin?tab=users&user=kevin_n&dialog=suspend")
    mpg.wait_for_selector("[role=alertdialog]")
    sql(f"update users set suspended_at = now(), suspended_reason = 'By someone else' where id = '{kevin}'")
    mpg.fill("input[name=reason]", "Spam again")
    dialog(mpg).locator("button[type=submit]").click()
    mpg.wait_for_selector("[role=alertdialog] [role=alert]:has-text('Already suspended')")
    calm = mpg.locator("[role=alertdialog] [role=alert]").get_attribute("class")
    check("an action already done answers calmly", "text-brand-strong" in calm, calm)
    shot(mpg, "04-already")
    check("and logs nothing", sql("select count(*) from audit_log where action = 'suspend'") == "1")
    sql(f"update users set suspended_at = null, suspended_reason = null where id = '{kevin}'")

    # 5. An admin resets the hour and signs Kevin out everywhere.
    session(kevin)
    apg.goto(BASE + "/admin?tab=users&user=kevin_n")
    apg.click("main a:has-text('Reset limit')")
    apg.wait_for_selector("[role=dialog]:has-text('Reset the hourly limit?')")
    shot(apg, "05-reset")
    confirm(apg, "Reset limit", "Client deadline, asked in support")
    apg.wait_for_url(lambda u: "done=reset" in u, timeout=15000)
    check("the header says the limit was reset", "Limit reset for @kevin_n" in header(apg), header(apg))
    check("the hour starts again", sql(f"select limit_reset_at is not null from users where id = '{kevin}'") == "t")
    apg.wait_for_selector("main section >> text=Kevin Novak")
    check("Reset limit goes once the hour is empty", "Reset limit" not in actions(apg), str(actions(apg)))
    apg.click("main a:has-text('Sign out everywhere')")
    apg.wait_for_selector("[role=alertdialog]:has-text('Sign out everywhere?')")
    check("the dialog lists the device", "Firefox · Windows" in dialog(apg).inner_text())
    confirm(apg, "Sign out everywhere", "Lost phone")
    apg.wait_for_url(lambda u: "done=signout" in u, timeout=15000)
    check("every session is gone", sql(f"select count(*) from sessions where user_id = '{kevin}'") == "0")

    # 6. The owner grants a role from Roles, looking the account up.
    opg.goto(BASE + "/admin?tab=roles")
    opg.click("main a:has-text('Grant role')")
    opg.wait_for_selector("[role=dialog]:has-text('Grant a staff role')")
    grant = dialog(opg).locator("button[type=submit]")
    opg.fill("input[placeholder='@username or email']", "guest-9")
    opg.wait_for_selector("text=No account by that @username or email")
    check("guests are never found", True)
    opg.fill("input[placeholder='@username or email']", "hana_m@example.com")
    opg.wait_for_selector("text=Already Admin")
    check("staff are found but can't be granted again", grant.is_disabled())
    opg.fill("input[placeholder='@username or email']", "@nora_f")
    opg.wait_for_selector("[role=dialog] >> text=Nora Ferreira")
    shot(opg, "06-grant")
    confirm(opg, "Grant role", "Joins support for the evening hours")
    opg.wait_for_url(lambda u: "done=grant" in u, timeout=15000)
    check("the header says who got the role", "Role granted to @nora_f" in header(opg), header(opg))
    check("Nora is a moderator", sql(f"select role from users where id = '{nora}'") == "moderator")
    opg.wait_for_selector("main >> text=Joins support for the evening hours")
    check("Roles lists the grant with its reason", True)

    # 7. Change her role from her page, then revoke it from Roles.
    opg.goto(BASE + "/admin?tab=users&user=nora_f")
    opg.click("main a:has-text('Change role')")
    opg.wait_for_selector("[role=dialog]:has-text('Change Nora Ferreira')")
    change = dialog(opg).locator("button[type=submit]")
    opg.fill("input[name=reason]", "Takes over the daily server checks")
    check("Change role waits for a different role", change.is_disabled())
    dialog(opg).locator("button[aria-pressed]:has-text('Admin')").click()
    shot(opg, "07-change-role")
    change.click()
    opg.wait_for_url(lambda u: "done=role" in u, timeout=15000)
    check("Nora is an admin", sql(f"select role from users where id = '{nora}'") == "admin")
    opg.goto(BASE + "/admin?tab=roles")
    opg.click("main li:has-text('Nora Ferreira') a:has-text('Revoke')")
    opg.wait_for_selector("[role=alertdialog]:has-text('Revoke Nora Ferreira')")
    confirm(opg, "Revoke", "Stepped back")
    opg.wait_for_url(lambda u: "done=revoke" in u, timeout=15000)
    check("Nora is a user again", sql(f"select role from users where id = '{nora}'") == "user")
    history = opg.locator("main section:has-text('Role changes') li").all_inner_texts()
    check("Roles shows the grant, the change and the revoke", len(history) == 3 and "Changed to" in history[1], str(history))
    shot(opg, "08-roles-history")

    # 8. Caps: the owner changes them; a value out of range can't be sent.
    opg.goto(BASE + "/admin?tab=spend&dialog=cap")
    opg.wait_for_selector("[role=dialog]:has-text('Change the caps')")
    save = dialog(opg).locator("button[type=submit]")
    opg.fill("input[name=reason]", "Quieter month")
    opg.fill("input[name=monthly]", "75")
    check("a monthly cap over the Anthropic limit can't be saved", save.is_disabled())
    opg.fill("input[name=monthly]", "30")
    opg.fill("input[name=daily]", "2.50")
    shot(opg, "09-caps")
    save.click()
    opg.wait_for_url(lambda u: "done=cap" in u, timeout=15000)
    check("the header says the caps were saved", "Caps saved" in header(opg), header(opg))
    caps = sql("select monthly_cap_usd || '|' || daily_cap_usd from settings")
    check("the caps are saved", caps == "30.00|2.50", caps)

    # 9. An admin pulls the guest brake and releases it, each with a reason.
    apg.goto(BASE + "/admin?tab=spend&dialog=pause-guests")
    apg.wait_for_selector("[role=alertdialog]:has-text('Pause guests?')")
    confirm(apg, "Pause guests", "Guest farming from one network")
    apg.wait_for_url(lambda u: "done=pause-guests" in u, timeout=15000)
    check("guests are paused", sql("select guests_paused_at is not null from settings") == "t")
    check("the pill shows on the console", apg.locator("text=Guests paused · since").count() >= 1)
    apg.goto(BASE + "/admin?tab=spend&dialog=resume-guests")
    apg.wait_for_selector("[role=dialog]:has-text('Resume guests?')")
    shot(apg, "10-resume")
    confirm(apg, "Resume", "The farming stopped")
    apg.wait_for_url(lambda u: "done=resume-guests" in u, timeout=15000)
    check("guests run again", sql("select guests_paused_at is null from settings") == "t")

    # 10. Activity words every action, with its reason.
    opg.goto(BASE + "/admin?tab=activity&kind=staff")
    opg.wait_for_selector("main ul li")
    staff_rows = opg.locator("main ul li").count()
    count = sql("select count(*) from audit_log")
    check("Activity lists every staff action", str(staff_rows) == count, f"{staff_rows} vs {count}")
    shot(opg, "11-activity")

    # 11. The demo shows the dialogs but sends nothing.
    dpg = device(b)
    posts = []
    dpg.on("request", lambda r: posts.append(r.url) if r.method == "POST" else None)
    dpg.goto(BASE + "/demo/admin?tab=spend&dialog=cap")
    dpg.wait_for_selector("text=Read-only demo · nothing is sent")
    check("the demo dialog has no submit button", dialog(dpg).locator("button[type=submit]").count() == 0)
    check("the demo dialog shows a sample reason", dpg.input_value("input[name=reason]") != "")
    dpg.click("[role=dialog] a:has-text('Close')")
    dpg.wait_for_url(lambda u: "dialog=" not in u)
    check("Close goes back to the page", "tab=spend" in dpg.url)
    check("the demo sent nothing", posts == [], str(posts))

    b.close()

passed = sum(ok for _, ok in results)
print(f"\n{passed}/{len(results)} passed")
raise SystemExit(0 if passed == len(results) else 1)
