"""The pictures for the README and the Upwork portfolio, taken from the real app (BUILD-RULES 10.4): a signed-in
account runs the real Sample through the real pipeline (the fake Claude answers it faithfully), and the admin
pictures come from the public demo, as a client would see them. Not a test.

Usage: SHOTS=<folder> python3 tests/e2e/showcase.py, with the fake Claude started as FAKE_DELAY_MS=25 (a real time)
Env as in the other suites (PG* for the owner connection, BASE_URL, CHROME). Empties the app's tables first.
Sizes: desktop 1440x900 at 2x (README), portfolio 1440x1080 at 1.5x (Upwork's 4:3 frame), phone 390x844 at 3x.
Packed into <SHOTS>/readme (WebP for docs/screenshots) and <SHOTS>/upwork (4:3 JPGs). Needs Pillow.
"""
import hashlib
import os
import secrets
import subprocess
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:3101")
COOKIE = os.environ.get("SESSION_COOKIE", "__Host-distill_session")
SHOTS = os.environ.get("SHOTS", "/tmp/showcase")
os.makedirs(SHOTS, exist_ok=True)
here = os.path.dirname(os.path.abspath(__file__))


def sql(q):
    r = subprocess.run(["psql", "-X", "-At", "-v", "ON_ERROR_STOP=1", "-c", q], capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"seed SQL failed: {r.stderr.strip()}")
    return r.stdout.strip()


subprocess.run(["psql", "-X", "-q", "-v", "ON_ERROR_STOP=1", "-f", os.path.join(here, "reset.sql")], check=True)
uid = sql("insert into users (name, username, email, password_hash, avatar_colour) values "
          "('Nora Ferreira', 'nora_f', 'nora@example.com', 'x', 'sage') returning id").splitlines()[0]

# A library with some history, so Saved and the profile have something to show.
LIBRARY = [
    ("Quarterly churn rose to 4.1% after the price change", "bullets", "checked", 60 * 3,
     "Churn climbed from 2.8% to 4.1% in the quarter after the March price change, mostly on the monthly plan.", ["4.1%", "2.8%"]),
    ("Draft lease: notice period and deposit terms", "short", "checked", 60 * 22,
     "Either side can end the lease with 60 days' notice, and the deposit is returned within 30 days.", ["60 days", "30 days"]),
    ("Why the onboarding flow loses users at step three", "medium", "none", 60 * 27,
     "Users drop off when they are asked to connect a calendar before they have seen the product.", []),
    ("Battery recycling plant gets regional approval", "short", "checked", 60 * 50,
     "The plant will process 20,000 tonnes of batteries a year from 2028 and employ about 240 people.", ["20,000", "2028", "240"]),
    ("Library hours extended over the exam weeks", "bullets", "checked", 60 * 74,
     "Weekday opening runs until midnight for three weeks, with two extra study rooms on the second floor.", ["3 weeks"]),
    ("Supplier audit finds two late payment terms", "medium", "flagged", 60 * 96,
     "Two suppliers were paid after 45 days, beyond the agreed 30-day terms.", ["45 days", "30-day"]),
    ("City budget moves funds to road repairs", "short", "checked", 60 * 120,
     "Road repairs get an extra $2M this year, taken from the unspent parking fund.", ["$2M"]),
    ("New bike lanes on the river road", "medium", "checked", 60 * 150,
     "Six kilometres of protected lanes open in spring, linking the station to the university.", ["6 km"]),
]
WORDS = [(1240, 160), (860, 90), (2100, 310), (640, 70), (1500, 140), (980, 120), (720, 80), (1830, 240)]
for (title, length, status, ago, point, figs), (words_in, words_out) in zip(LIBRARY, WORDS):
    title, point = title.replace("'", "''"), point.replace("'", "''")
    fig = ",".join(f'{{"id": {i + 1}, "value": "{v}", "label": "figure", "sourceIds": [1]}}' for i, v in enumerate(figs))
    sql("insert into summaries (user_id, title, source_text, sentences, points, figures, figure_status, length, model,"
        " input_tokens, output_tokens, cost_usd, seconds, words_in, words_out, created_at) values"
        f" ('{uid}', '{title}', '{point}', '[{{\"id\": 1, \"text\": \"{point}\", \"paragraph\": 1}}]',"
        f" '[{{\"id\": 1, \"text\": \"{point}\", \"sourceIds\": [1]}}]', '[{fig}]', '{status}', '{length}', 'claude-haiku-5-5',"
        f" {words_in * 2}, {words_out * 2}, 0.0002, 2.1, {words_in}, {words_out}, now() - interval '{ago} minutes')")

token = secrets.token_urlsafe(32)
sql(f"insert into sessions (token_hash, user_id, browser, os) values "
    f"(decode('{hashlib.sha256(token.encode()).hexdigest()}', 'hex'), '{uid}', 'Chrome', 'Windows')")

SIZES = {"desktop": ((1440, 900), 2, False), "upwork": ((1440, 1080), 1.5, False), "phone": ((390, 844), 3, True)}


def shot(pg, name):
    pg.wait_for_timeout(700)
    pg.mouse.move(0, 0)
    pg.screenshot(path=os.path.join(SHOTS, f"{name}.png"))
    print(name)


with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get("CHROME") or None)
    for scheme in ["dark", "light"]:
        for size, ((w, h), scale, mobile) in SIZES.items():
            tag = f"{size}-{scheme}"
            sql(f"update users set result_view = 'split' where id = '{uid}'")
            # Each picture set starts from the same account: one Harbor Street result, a fresh hour.
            sql(f"delete from summaries where user_id = '{uid}' and title like 'Harbor Street%'")
            sql(f"delete from usage_events where user_id = '{uid}'")
            ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=scale, is_mobile=mobile,
                                has_touch=mobile, color_scheme=scheme, timezone_id="Europe/Istanbul")
            ctx.add_cookies([{"name": COOKIE, "value": token, "domain": "localhost", "path": "/", "secure": True, "httpOnly": True},
                             {"name": "tz", "value": "Europe%2FIstanbul", "domain": "localhost", "path": "/"}])
            pg = ctx.new_page()
            pg.goto(BASE + "/")
            pg.wait_for_selector("[data-composer]")
            pg.click("button:has-text('Sample')")
            shot(pg, f"composer-{tag}")
            pg.click("[data-composer] button:has-text('Distill')")
            pg.wait_for_selector("text=Copy", timeout=20000)
            pg.wait_for_timeout(1200)  # the opening motion and the lines settle
            shot(pg, f"result-{tag}")
            if not mobile:
                pg.click("[aria-label='Result view'] button:has-text('Column')")
                pg.wait_for_timeout(600)
                shot(pg, f"column-{tag}")
            pg.goto(BASE + "/saved")
            pg.wait_for_selector("main")
            shot(pg, f"saved-{tag}")
            pg.goto(BASE + "/profile")
            pg.wait_for_selector("main")
            shot(pg, f"profile-{tag}")
            ctx.close()

            anon = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=scale, is_mobile=mobile,
                                 has_touch=mobile, color_scheme=scheme, timezone_id="Europe/Istanbul")
            pg = anon.new_page()
            pg.goto(BASE + "/login")  # sets the tz, vh and vw cookies before the demo
            shot(pg, f"login-{tag}")
            for t in ["overview", "server", "activity", "users"]:
                pg.goto(BASE + f"/demo/admin?tab={t}")
                pg.wait_for_selector("main")
                shot(pg, f"demo-{t}-{tag}")
            anon.close()
    b.close()

# ---- Packed for use: README pictures (WebP, 1920 wide, a transparent phone trio) and Upwork's 4:3 JPGs.
from PIL import Image, ImageDraw  # noqa: E402

os.makedirs(os.path.join(SHOTS, "readme"), exist_ok=True)
os.makedirs(os.path.join(SHOTS, "upwork"), exist_ok=True)


def src(name):
    return Image.open(os.path.join(SHOTS, f"{name}.png"))


def rounded(im, r):
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, im.width - 1, im.height - 1], r, fill=255)
    out = im.convert("RGBA")
    out.putalpha(mask)
    return out


def trio(scheme, bg=None, size=None):
    ims = [rounded(src(f"{n}-phone-{scheme}"), 60) for n in ["composer", "result", "demo-overview"]]
    gap = 90
    w, h = sum(i.width for i in ims) + gap * (len(ims) - 1), ims[0].height
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    x = 0
    for i in ims:
        canvas.alpha_composite(i, (x, 0))
        x += i.width + gap
    if size is None:
        return canvas
    width, height = size
    pad = int(height * 0.08)
    s = min((width - 2 * pad) / w, (height - 2 * pad) / h)
    c = canvas.resize((int(w * s), int(h * s)), Image.LANCZOS)
    out = Image.new("RGBA", size, bg)
    out.alpha_composite(c, ((width - c.width) // 2, (height - c.height) // 2))
    return out


UPWORK = {"result": "01-result-split", "column": "02-result-column", "composer": "03-composer", "saved": "04-saved",
          "demo-overview": "05-admin-overview", "demo-server": "06-admin-server", "demo-activity": "07-admin-activity"}
for scheme in ["dark", "light"]:
    for name, label in UPWORK.items():
        src(f"{name}-desktop-{scheme}").convert("RGB").resize((1920, 1200), Image.LANCZOS).save(
            os.path.join(SHOTS, "readme", f"{name}-{scheme}.webp"), "WEBP", quality=90, method=6)
        src(f"{name}-upwork-{scheme}").convert("RGB").save(
            os.path.join(SHOTS, "upwork", f"{label}-{scheme}.jpg"), "JPEG", quality=92, optimize=True)
    t = trio(scheme)
    t.resize((t.width * 1200 // t.height, 1200), Image.LANCZOS).save(
        os.path.join(SHOTS, "readme", f"phone-{scheme}.webp"), "WEBP", quality=90, method=6)
    bg = (14, 17, 22, 255) if scheme == "dark" else (236, 238, 241, 255)
    trio(scheme, bg, (2160, 1620)).convert("RGB").save(
        os.path.join(SHOTS, "upwork", f"08-phone-{scheme}.jpg"), "JPEG", quality=92, optimize=True)
print("packed: readme/ and upwork/")
