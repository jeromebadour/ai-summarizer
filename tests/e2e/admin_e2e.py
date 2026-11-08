"""End-to-end checks for the admin console on real data (step 1: staff reads). Each role sees only its tabs, no
staff page ever shows what anyone pasted or got back, filters and paging run on the server and live in the URL,
and the demo still reads only its invented data. Env as in distill_e2e.py; SHOTS=<folder> saves pictures.
Wipes the test database's users first.
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


def device(b, token=None):
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, color_scheme="dark", timezone_id="Europe/Istanbul")
    cookies = [{"name": "tz", "value": "Europe%2FIstanbul", "domain": "localhost", "path": "/"}]
    if token:
        cookies.append({"name": COOKIE, "value": token, "domain": "localhost", "path": "/", "secure": True, "httpOnly": True})
    ctx.add_cookies(cookies)
    return ctx.new_page()


def tabs(pg):
    return pg.locator("main nav").first.locator("a").all_inner_texts()


def shot(pg, name):
    if SHOTS:
        pg.wait_for_timeout(300)
        pg.screenshot(path=os.path.join(SHOTS, f"admin-{name}.png"))


# A clean world: four staff levels, a user with a summary full of secrets, a guest, and enough people to page.
sql("delete from usage_events; delete from audit_log; delete from auth_events; delete from request_errors; "
    "delete from summaries; delete from sessions; update users set role = 'user' where role = 'owner'; delete from users; "
    "update settings set guests_paused_at = null, all_paused_at = null")


def person(name, username, role):
    return sql(f"insert into users (name, username, email, password_hash, role) values ('{name}', '{username}', "
               f"'{username}@example.com', 'x', '{role}') returning id").splitlines()[0]


owner = person("Jerome Badour", "jerome", "owner")
admin = person("Hana Mori", "hana_m", "admin")
mod = person("Lena Schmidt", "lena_s", "moderator")
kevin = person("Kevin Novak", "kevin_n", "user")
guest = sql("insert into users (name, username, role) values ('Guest 9', 'guest-9', 'guest') returning id").splitlines()[0]
for i in range(1, 19):
    person(f"Tester {i:02d}", f"tester_{i:02d}", "user")
sql(f"""insert into summaries (user_id, title, source_text, sentences, points, figures, figure_status, length, model,
  input_tokens, output_tokens, cost_usd, seconds, words_in, words_out)
  values ('{kevin}', 'SECRET-TITLE', 'SECRET-SOURCE', '[{{"id":1,"text":"SECRET-SENTENCE","paragraph":1}}]',
  '[{{"id":1,"text":"SECRET-POINT","sourceIds":[1]}}]', '[]', 'none', 'medium', 'claude-haiku-5-5', 1200, 180, 0.0002, 2, 900, 110)""")
sql(f"""insert into usage_events (user_id, is_guest, input_tokens, output_tokens, cost_usd, recorded, length, words) values
  ('{kevin}', false, 1200, 180, 0.0002, true, 'medium', 900), ('{guest}', true, 500, 90, 0.0001, true, 'bullets', 300)""")
sql(f"insert into auth_events (user_id, kind) values ('{kevin}', 'signup'), ('{guest}', 'guest'), ('{kevin}', 'signin')")
sql(f"insert into audit_log (actor_id, action, target_user_id, reason, details) values "
    f"('{owner}', 'grant_role', '{admin}', 'Runs support', '{{\"role\":\"admin\"}}')")
# 20 sign-ins by one tester, so Activity has more than a page.
sql("insert into auth_events (user_id, kind) select id, 'signin' from users, generate_series(1, 20) where username = 'tester_01'")

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get("CHROME") or None)

    # 1. Who gets in, and which tabs they see.
    pg = device(b)
    pg.goto(BASE + "/admin")
    pg.wait_for_url("**/login**", timeout=10000)
    check("signed out goes to sign-in", "/login" in pg.url)

    pg = device(b, session(kevin))
    pg.goto(BASE + "/admin")
    pg.wait_for_load_state("networkidle")
    check("a user gets the not-found page", pg.locator("h1:has-text('Admin')").count() == 0 and pg.locator("text=Kevin Novak").count() == 0)

    expected = {"owner": (owner, ["Overview", "Users", "Activity", "Spend", "Roles"]),
                "admin": (admin, ["Overview", "Users", "Activity", "Spend"]),
                "moderator": (mod, ["Users", "Activity"])}
    pages = {}
    for role, (uid, want) in expected.items():
        pg = device(b, session(uid))
        pg.goto(BASE + "/admin")
        pg.wait_for_selector("h1:has-text('Admin')", timeout=15000)
        got = [t.strip() for t in tabs(pg)]
        check(f"{role} sees {', '.join(want)}", got == want, str(got))
        pages[role] = pg
    check("the Server tab stays hidden until the box is ready", all("Server" not in tabs(pg) for pg in pages.values()))

    # A moderator asking for a tab they can't have lands on their first one.
    mpg = pages["moderator"]
    mpg.goto(BASE + "/admin?tab=spend")
    mpg.wait_for_selector("h1:has-text('Admin')")
    check("a moderator asking for Spend gets Users", mpg.locator("input[placeholder*='username or email']").count() == 1)
    mpg.goto(BASE + "/admin?tab=roles")
    mpg.wait_for_selector("h1:has-text('Admin')")
    check("a moderator asking for Roles gets Users, no role history", mpg.locator("input[placeholder*='username or email']").count() == 1 and mpg.locator("text=Runs support").count() == 0)

    # 2. Overview figures come from the database.
    opg = pages["owner"]
    shot(opg, "01-overview-owner")
    body = opg.inner_text("main")
    check("overview counts the registered accounts", "22" in body, body[:300])
    check("overview hides the server Details link", opg.locator("main a:has-text('Details')").count() == 0)
    check("overview shows no backup or certificate facts yet", "Backup" not in body and "HTTPS" not in body)

    # 3. No page a staff member can open shows anyone's text.
    leaks = []
    for role, pg in pages.items():
        for path in ["/admin", "/admin?tab=users", "/admin?tab=users&user=kevin_n", "/admin?tab=activity", "/admin?tab=spend", "/admin?tab=roles"]:
            pg.goto(BASE + path)
            pg.wait_for_selector("h1:has-text('Admin')")
            if "SECRET" in pg.content():
                leaks.append(f"{role} {path}")
    check("no staff page carries anyone's text", not leaks, ", ".join(leaks))

    # 4. Users: paging, role chips and search, all in the URL.
    opg.goto(BASE + "/admin?tab=users")
    opg.wait_for_selector("text=tester_18")
    rows = opg.locator("main ul li").count()
    check("users show 15 a page", rows == 15, str(rows))
    shot(opg, "02-users")
    opg.click("main a:text-is('2')")
    opg.wait_for_url("**page=2**")
    opg.wait_for_selector("text=kevin_n")
    check("page 2 holds the other 8", opg.locator("main ul li").count() == 8, str(opg.locator("main ul li").count()))

    opg.goto(BASE + "/admin?tab=users")
    opg.click("main a[aria-pressed]:has-text('Moderator')")
    opg.wait_for_url("**role=moderator**")
    opg.wait_for_selector("text=lena_s")
    check("the Moderator chip shows only moderators", opg.locator("main ul li").count() == 1)
    check("the chip shows as on", opg.locator("main a[aria-pressed=true]:has-text('Moderator')").count() == 1)

    opg.goto(BASE + "/admin?tab=users")
    opg.fill("input[placeholder*='username or email']", "novak")
    opg.wait_for_url("**q=novak**", timeout=10000)
    opg.wait_for_function("() => document.querySelectorAll('main ul li').length === 1", timeout=10000)
    check("search finds Kevin by surname", "kevin_n" in opg.inner_text("main ul"))
    opg.click("button[aria-label='Clear search']")
    opg.wait_for_function("() => document.querySelectorAll('main ul li').length === 15", timeout=10000)
    check("clearing the search brings back everyone", "q=" not in opg.url, opg.url)

    opg.goto(BASE + "/admin?tab=users&user=kevin_n")
    opg.wait_for_selector("text=Kevin Novak")
    shot(opg, "03-user-detail")
    check("a user's page opens from the database", opg.locator("text=kevin_n@example.com").count() >= 1)
    opg.goto(BASE + "/admin?tab=users&user=nobody_here")
    opg.wait_for_load_state("networkidle")
    check("an unknown username is not found", opg.locator("text=Kevin Novak").count() == 0)

    # 5. Activity: newest first, kinds and who in the URL, paged.
    opg.goto(BASE + "/admin?tab=activity")
    opg.wait_for_selector("main ul li")
    check("activity shows 15 a page", opg.locator("main ul li").count() == 15)
    shot(opg, "04-activity")
    opg.click("main a[aria-pressed]:has-text('Staff')")
    opg.wait_for_url("**kind=staff**")
    opg.wait_for_function("() => document.querySelectorAll('main ul li').length === 1", timeout=10000)
    staff_row = opg.inner_text("main ul")
    check("the staff row says what was done", "hana_m" in staff_row or "Hana" in staff_row, staff_row)
    opg.goto(BASE + "/admin?tab=activity")
    opg.fill("input[placeholder='Search @username']", "kevin_n")
    opg.wait_for_url("**who=kevin_n**", timeout=10000)
    opg.wait_for_function("() => document.querySelectorAll('main ul li').length < 15", timeout=10000)
    kevin_rows = opg.locator("main ul li").all_inner_texts()
    # Kevin signed up, signed in and made one summary (the summary comes from the ledger: no title, no text).
    check("who-search keeps Kevin's events only", len(kevin_rows) == 3 and all("kevin_n" in r for r in kevin_rows), str(kevin_rows))

    # 6. Spend reads the ledger.
    opg.goto(BASE + "/admin?tab=spend")
    opg.wait_for_selector("text=kevin_n")
    shot(opg, "05-spend")
    check("spend lists who used Claude", opg.locator("main >> text=kevin_n").count() >= 1)

    # 7. Roles is owner-only and real.
    opg.goto(BASE + "/admin?tab=roles")
    opg.wait_for_selector("text=hana_m")
    shot(opg, "06-roles")
    check("roles show the grant and its reason", opg.locator("text=Runs support").count() >= 1)

    # 8. A moderator's user page has no spend.
    mpg.goto(BASE + "/admin?tab=users&user=kevin_n")
    mpg.wait_for_selector("text=Kevin Novak")
    shot(mpg, "07-moderator-user")
    check("a moderator sees no costs on a user page", "$" not in mpg.inner_text("main") and "¢" not in mpg.inner_text("main"))
    mpg.goto(BASE + "/admin?tab=users")
    mpg.wait_for_selector("text=tester_18")
    check("a moderator's list has no Spend column", "Spend" not in mpg.inner_text("main") and "¢" not in mpg.inner_text("main"))
    shot(mpg, "08-moderator-users")
    mpg.goto(BASE + "/admin?tab=activity&kind=summary")
    mpg.wait_for_selector("main ul li")
    row = mpg.inner_text("main ul")
    check("a moderator's activity shows size, not cost", "900 words" in row and "¢" not in row, row)

    # 9. The demo still runs on invented data only, and shows every tab.
    dpg = device(b)
    seen = []
    dpg.on("request", lambda r: seen.append(r.url))
    dpg.goto(BASE + "/demo/admin")
    dpg.wait_for_selector("text=Demo · invented data as of Sat 7 Nov, 12:31 · read-only")
    got = [t.strip() for t in tabs(dpg)]
    check("the demo shows all six tabs", got == ["Overview", "Server", "Users", "Activity", "Spend", "Roles"], str(got))
    check("the demo shows none of the real people", "tester_01" not in dpg.content() and "Tester 18" not in dpg.content())
    dpg.goto(BASE + "/demo/admin?tab=users")
    dpg.wait_for_selector("main ul li")
    check("the demo pages its users too", dpg.locator("main ul li").count() == 15)
    shot(dpg, "09-demo-users")

    # 10a. A press shows at once: hold the server's answer back a second, and the tab still lights up before it arrives.
    import time as _t
    def slow(route):
        _t.sleep(1.0)
        route.continue_()
    dpg.route("**/demo/admin?tab=roles*", slow)
    indigo = dpg.evaluate("getComputedStyle(document.querySelector('main nav a[aria-current=page]')).backgroundColor")
    dpg.locator("main nav a", has_text="Roles").click(no_wait_after=True)
    dpg.mouse.move(5, 5)  # off the tab, so its hover colour can't pass for the pressed one
    try:
        dpg.wait_for_function("""(indigo) => { const a=[...document.querySelectorAll('main nav a')].find(e=>e.textContent.trim()=='Roles');
          return a && a.getAttribute('aria-current')!=='page' && getComputedStyle(a).backgroundColor===indigo }""", arg=indigo, timeout=600)
        lit = True
    except Exception:
        lit = False
    check("a pressed tab turns indigo before the server answers", lit)
    check("the page below dims while it waits", dpg.evaluate("getComputedStyle(document.querySelector('main > :nth-child(2)')).opacity") != "1")
    dpg.wait_for_selector("main nav a[aria-current=page]:has-text('Roles')")
    check("then the server's answer confirms it", dpg.evaluate("getComputedStyle(document.querySelector('main > :nth-child(2)')).opacity") == "1")
    dpg.unroute("**/demo/admin?tab=roles*")

    # 10. The demo's way out is in plain sight, and fits who is looking.
    exit_btn = dpg.locator("main a", has_text="Sign in to Distill")
    check("a visitor sees Sign in to Distill at the top right", exit_btn.count() == 1 and exit_btn.get_attribute("href") == "/login")
    exit_btn.click()
    dpg.wait_for_url(BASE + "/login")
    check("it opens sign-in", dpg.url == BASE + "/login")
    mpg.goto(BASE + "/demo/admin")
    back = mpg.locator("main a", has_text="Back to Distill")
    check("a signed-in person sees Back to Distill instead", back.count() == 1 and mpg.locator("text=Sign in to Distill").count() == 0)
    shot(mpg, "10-demo-signed-in")
    back.click()
    mpg.wait_for_url(BASE + "/")
    mpg.wait_for_selector("textarea")
    check("it goes back to their own Distill", mpg.url == BASE + "/", mpg.url)

    # 11. The box reports itself (migration 011, ops/collector.py): the Server tab opens on real readings.
    soon = "2027-02-05T10:00:00+00:00"
    import datetime as _dt
    from zoneinfo import ZoneInfo
    started = _dt.datetime.now(_dt.timezone.utc) - _dt.timedelta(minutes=10)
    started_at = started.astimezone(ZoneInfo("Europe/Istanbul")).strftime("%H:%M")
    facts = ('{"os": "Ubuntu 24.04.5 LTS", "kernel": "6.8.0-149-generic", "region": "Singapore", "cpus": 6, "memoryGb": 12, '
             '"diskGb": 194, "uptimeSeconds": 302400, "firewallPorts": [22, 80, 443], "bannedNow": 2, "bannedToday": 9, '
             '"updatesPending": 0, "sshPasswordOff": true, "certExpires": "' + soon + '", "appStartedAt": "' + started.isoformat() + '"}')
    sql("insert into server_samples (taken_at, cpu, load1, memory, disk, db_size_mb, connections) values "
        "(now() - interval '2 hours', 30, 0.9, 40, 22.4, 9, 4), (now() - interval '1 hour', 20, 0.5, 39, 22.4, 9, 4)")
    sql(f"set role distill_collector; select record_server_sample(12, 0.3, 41, 22.5); select record_server_facts('{facts}')")
    opg.goto(BASE + "/admin")
    opg.wait_for_selector("h1:has-text('Admin')")
    check("the owner sees the Server tab once the box reports", "Server" in tabs(opg), str(tabs(opg)))
    check("the Overview links to it", opg.locator("main a:has-text('Details')").count() == 1)
    check("the Overview shows the certificate from the box", "HTTPS" in opg.inner_text("main"))
    opg.goto(BASE + "/admin?tab=server")
    opg.wait_for_selector("text=Singapore")
    body = opg.inner_text("main")
    for want in ["Ubuntu 24.04.5 LTS", "6 vCPU · 12 GB memory · 194 GB disk", "up 3 days", "41%", "open: 22, 80, 443",
                 "2 now · 9 today", "SSH key only · passwords off", "none pending", "valid until Feb 5, 2027", started_at]:
        check(f"the Server tab shows {want}", want in body, body[:400])
    check("its lines are the box's hours", body.count("3 h ·") == 4, body[:400])
    shot(opg, "11-server")
    apg = pages["admin"]
    apg.goto(BASE + "/admin")
    apg.wait_for_selector("h1:has-text('Admin')")
    check("an admin sees it too", "Server" in tabs(apg))
    mpg.goto(BASE + "/admin?tab=server")
    mpg.wait_for_selector("h1:has-text('Admin')")
    check("a moderator never does", "Server" not in tabs(mpg) and "Singapore" not in mpg.inner_text("main"))

    # A line the box couldn't read is left out, not guessed.
    sql("set role distill_collector; select record_server_facts('{\"os\": \"Ubuntu 24.04.5 LTS\", \"cpus\": 6}')")
    opg.goto(BASE + "/admin?tab=server")
    opg.wait_for_selector("text=Ubuntu 24.04.5 LTS")
    body = opg.inner_text("main")
    check("no Security card without facts", "Firewall" not in body and "Security" not in body, body[-300:])

    # Real problems, and only those, raise the alarm.
    in5 = sql("select to_char(now() + interval '5 days', 'YYYY-MM-DD\"T\"HH24:MI:SS\"+00:00\"')")
    sql(f"set role distill_collector; select record_server_facts('{{\"certExpires\": \"{in5}\"}}')")
    sql("update server_samples set taken_at = taken_at - interval '20 minutes'")
    opg.goto(BASE + "/admin")
    opg.wait_for_selector("h1:has-text('Admin')")
    alarm = opg.locator("section[role=alert]").inner_text() if opg.locator("section[role=alert]").count() else ""
    check("a silent collector is flagged", "The box stopped reporting" in alarm, alarm)
    check("a certificate near its end is flagged", "The HTTPS certificate expires soon" in alarm, alarm)

    b.close()

passed = sum(ok for _, ok in results)
print(f"\n{passed}/{len(results)} passed")
raise SystemExit(0 if passed == len(results) else 1)
