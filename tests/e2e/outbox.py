"""The account emails the app wrote to EMAIL_OUTBOX (no Resend in tests): the newest one to an address, its code and
its link. OUTBOX is the same folder on this machine (CI mounts it into the app's container)."""
import glob
import json
import os
import re
import time

OUTBOX = os.environ.get("OUTBOX", "/tmp/distill-outbox")


def emails_to(address):
    found = []
    for path in glob.glob(os.path.join(OUTBOX, "*.json")):
        with open(path) as f:
            mail = json.load(f)
        if mail["to"].lower() == address.lower():
            found.append((os.path.getmtime(path), path, mail))
    return [m for _, _, m in sorted(found, key=lambda x: (x[0], x[1]))]


def newest(address, after=0, wait=10):
    """The newest email to `address` once there are more than `after`; waits up to `wait` seconds for it."""
    end = time.time() + wait
    while time.time() < end:
        mails = emails_to(address)
        if len(mails) > after:
            return mails[-1]
        time.sleep(0.2)
    raise SystemExit(f"no email to {address} (had {after})")


def code_of(mail):
    return "".join(re.search(r"Your code: (\d{3}) (\d{3})", mail["text"]).groups())


def link_of(mail):
    return re.search(r"(https?://\S+token=[A-Za-z0-9_-]+)", mail["text"]).group(1)


def clear():
    for path in glob.glob(os.path.join(OUTBOX, "*.json")):
        os.remove(path)


def confirm(pg, address, base, then="/"):
    """On /verify: types the newest code sent to `address` (pasting it fills all six boxes) and lands on `then`."""
    pg.wait_for_url(base + "/verify", timeout=15000)
    code = code_of(newest(address))
    pg.locator("input[aria-label='Digit 1 of 6']").fill(code)
    pg.click("button:has-text('Verify email')")
    pg.wait_for_url(base + then, timeout=15000)
