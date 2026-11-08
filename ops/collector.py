#!/usr/bin/env python3
"""The Freelance box reports itself to Distill's admin console.

Run every minute by ops/systemd/distill-collector.timer, as root on the host (firewall, fail2ban and pending updates
can't be read from inside a container). Each run records CPU, load, memory and disk; every 15 minutes it also records
the host's facts (system, size, uptime, firewall, blocked addresses, pending security updates, SSH sign-in, the HTTPS
certificate's expiry, when the app started). It signs in to the database as `distill_collector` over the database
container's own socket; that role can only call record_server_sample() and record_server_facts() (migration 011).
Installed by scripts/deploy.sh to /opt/sites/tools/distill/. Prints nothing when all is well; errors go to the journal.
"""
import datetime as dt
import glob
import json
import os
import platform
import re
import subprocess
import sys
import time

REGION = "Singapore"
CERT = "/etc/letsencrypt/live/distill.jeromebadour.com/cert.pem"
FAIL2BAN_LOG = "/var/log/fail2ban.log"
STAMP = "/var/lib/distill-collector/facts-at"
BACKUP_DIR = os.environ.get("BACKUP_DIR", "/srv/distill/backups")
FACTS_EVERY = 15 * 60


def run(*cmd: str, stdin: str | None = None) -> str:
    """Output of a command, or "" when it isn't there or fails (a missing fact is left out, never invented)."""
    try:
        r = subprocess.run(cmd, input=stdin, capture_output=True, text=True, timeout=60, check=False)
        return r.stdout + r.stderr if r.returncode == 0 else ""
    except (OSError, subprocess.TimeoutExpired):
        return ""


def container(service: str) -> str:
    ids = run("docker", "ps", "-q", "--filter", "label=com.docker.compose.project=distill",
              "--filter", f"label=com.docker.compose.service={service}").split()
    return ids[0] if ids else ""


def sql(statement: str, **variables: str) -> None:
    db = container("db")
    if not db:
        sys.exit("collector: the database container is not running")
    args = ["docker", "exec", "-i", db, "psql", "-X", "-q", "-v", "ON_ERROR_STOP=1", "-U", "distill_collector", "-d", "distill"]
    for name, value in variables.items():
        args += ["-v", f"{name}={value}"]
    r = subprocess.run(args + ["-f", "-"], input=statement, capture_output=True, text=True, timeout=30, check=False)
    if r.returncode != 0:
        sys.exit(f"collector: the database refused: {r.stderr.strip()}")


def cpu_percent() -> float:
    def snap() -> tuple[int, int]:
        with open("/proc/stat") as f:
            v = [int(x) for x in f.readline().split()[1:]]
        idle = v[3] + v[4]  # idle + iowait
        return idle, sum(v[:8])  # leave out guest time, already counted in user
    i1, t1 = snap()
    time.sleep(1)
    i2, t2 = snap()
    return round(100 * (1 - (i2 - i1) / (t2 - t1)), 1) if t2 > t1 else 0.0


def meminfo() -> dict[str, int]:
    with open("/proc/meminfo") as f:
        return {k: int(v.split()[0]) for k, v in (line.split(":", 1) for line in f)}


def sample() -> None:
    m = meminfo()
    memory = round(100 * (1 - m["MemAvailable"] / m["MemTotal"]), 1)
    st = os.statvfs("/")
    disk = round(100 * (1 - st.f_bavail / st.f_blocks), 1)
    load = round(os.getloadavg()[0], 2)
    sql(f"select record_server_sample({cpu_percent()}, {load}, {memory}, {disk});")


def facts() -> dict:
    out: dict = {"region": REGION, "kernel": platform.release(), "cpus": os.cpu_count()}
    with open("/etc/os-release") as f:
        release = dict(line.rstrip("\n").split("=", 1) for line in f if "=" in line)
    out["os"] = release.get("PRETTY_NAME", "").strip('"')
    out["memoryGb"] = round(meminfo()["MemTotal"] * 1024 / 1e9)
    st = os.statvfs("/")
    out["diskGb"] = round(st.f_blocks * st.f_frsize / 1e9)
    with open("/proc/uptime") as f:
        out["uptimeSeconds"] = int(float(f.read().split()[0]))

    ufw = run("ufw", "status")
    if ufw.startswith("Status: active"):
        out["firewallPorts"] = sorted({int(p) for p in re.findall(r"^(\d+)(?:/tcp)?\s+ALLOW", ufw, re.MULTILINE)})

    jail = run("fail2ban-client", "status", "sshd")
    banned = re.search(r"Currently banned:\s*(\d+)", jail)
    if banned:
        out["bannedNow"] = int(banned.group(1))
        today = dt.datetime.now(dt.timezone.utc).date().isoformat()  # the box and its log run in UTC
        try:
            with open(FAIL2BAN_LOG) as f:
                out["bannedToday"] = sum(1 for line in f if line.startswith(today) and "] Ban " in line)
        except OSError:
            pass

    # Ubuntu's own count: "all;security" on stderr.
    check = run("/usr/lib/update-notifier/apt-check")
    if re.fullmatch(r"\d+;\d+", check.strip()):
        out["updatesPending"] = int(check.strip().split(";")[1])

    sshd = run("sshd", "-T")
    if sshd:
        out["sshPasswordOff"] = bool(re.search(r"^passwordauthentication no$", sshd, re.MULTILINE))

    end = run("openssl", "x509", "-enddate", "-noout", "-in", CERT)
    if end.startswith("notAfter="):
        when = dt.datetime.strptime(end.split("=", 1)[1].strip(), "%b %d %H:%M:%S %Y %Z").replace(tzinfo=dt.timezone.utc)
        out["certExpires"] = when.isoformat()

    # Backups (ops/backup.sh): the newest four, and the last restore test (ops/restore-test.sh).
    dumps = sorted(glob.glob(os.path.join(BACKUP_DIR, "distill-*.dump")), key=os.path.getmtime, reverse=True)
    if dumps:
        out["backups"] = {
            "count": len(dumps),
            "recent": [
                {"name": os.path.basename(d), "at": utc(os.path.getmtime(d)), "bytes": os.path.getsize(d)} for d in dumps[:4]
            ],
        }
    # The off-box copy (ops/offsite.sh) and the last restore test (which tests that copy once it exists).
    for key, name in (("restore", "restore-test.json"), ("offsite", "offsite.json")):
        try:
            with open(os.path.join(BACKUP_DIR, name)) as f:
                out[key] = json.load(f)
        except (OSError, ValueError):
            pass
    nxt = run("systemctl", "show", "distill-backup.timer", "-p", "NextElapseUSecRealtime", "--value").strip()
    if nxt and nxt != "n/a":
        try:
            when = dt.datetime.strptime(nxt, "%a %Y-%m-%d %H:%M:%S %Z").replace(tzinfo=dt.timezone.utc)
            out["nextBackup"] = when.isoformat()
        except ValueError:
            pass

    app = container("app")
    started = run("docker", "inspect", "-f", "{{.State.StartedAt}}", app).strip() if app else ""
    if started:
        out["appStartedAt"] = started
    return out


def utc(t: float) -> str:
    return dt.datetime.fromtimestamp(t, dt.timezone.utc).isoformat()


def facts_due() -> bool:
    try:
        return time.time() - os.path.getmtime(STAMP) >= FACTS_EVERY - 30
    except OSError:
        return True


def main() -> None:
    sample()
    if facts_due() or "--facts" in sys.argv:
        sql("select record_server_facts(:'facts'::jsonb);", facts=json.dumps(facts()))
        os.makedirs(os.path.dirname(STAMP), exist_ok=True)
        with open(STAMP, "w") as f:
            f.write(dt.datetime.now(dt.timezone.utc).isoformat())


if __name__ == "__main__":
    main()
