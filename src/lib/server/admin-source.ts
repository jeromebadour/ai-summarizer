import "server-only";
import { statfs } from "node:fs/promises";
import os from "node:os";
import {
  usageLine,
  whenLabel,
  type ActivityEntry,
  type ActivityKind,
  type AdminOverview,
  type AttentionItem,
  type Person,
  type Recency,
  type ServerHealth,
  type SummaryUsage,
  type UserDetail,
  type UserRow,
} from "@/lib/admin";
import type { AdminSource } from "@/lib/admin-source";
import { pageOf, pageSizes } from "@/lib/paging";
import { roles, type Role } from "@/lib/permissions";
import type { DeviceKind } from "@/lib/profile";
import { staffActionLabel, staffSentence, type AuditFacts } from "@/lib/staff-words";
import { actingAs } from "./db";
import type { CurrentUser } from "./session";
import { agoLabel, partsIn } from "./zone";

/**
 * The live console's answers, from the staff functions in migration 007 (each checks the viewer's role in the
 * database and returns metadata only). Pages are cut in the database; nothing beyond one page reaches the browser.
 */

type J = Record<string, unknown>;
const lengthWord = { short: "Short", medium: "Medium", bullets: "Bullets" } as const;

function person(j: J | null | undefined): Person | null {
  if (!j) return null;
  return { id: String(j.id), name: String(j.name), username: String(j.username), avatarColour: j.avatarColour as Person["avatarColour"], role: j.role as Role };
}

function deviceKind(os_: string): DeviceKind {
  if (os_ === "iOS" || os_ === "Android") return "phone";
  if (os_ === "macOS" || os_ === "ChromeOS") return "laptop";
  return "desktop";
}

/** CPU busy share over a short real sample (not the load average dressed up as a percentage). */
async function cpuPercent(): Promise<number> {
  const snap = () => os.cpus().map((c) => ({ idle: c.times.idle, total: Object.values(c.times).reduce((s, n) => s + n, 0) }));
  const a = snap();
  await new Promise((r) => setTimeout(r, 200));
  const b = snap();
  let idle = 0;
  let total = 0;
  b.forEach((x, i) => {
    idle += x.idle - a[i].idle;
    total += x.total - a[i].total;
  });
  return total > 0 ? Math.round(((total - idle) / total) * 100) : 0;
}

async function diskPercent(): Promise<{ percent: number; sizeGb: number }> {
  try {
    const s = await statfs("/");
    return { percent: Math.round(((s.blocks - s.bavail) / s.blocks) * 100), sizeGb: Math.round((s.blocks * s.bsize) / 1e9) };
  } catch {
    return { percent: 0, sizeGb: 0 };
  }
}

function health(cpu: number, memory: number, disk: number): ServerHealth {
  const top = Math.max(cpu, memory, disk);
  return top >= 90 ? "strained" : top >= 70 ? "busy" : "comfortable";
}

/** `rows` is how many table rows fit the viewer's window (pageSizeFor). */
export function liveSource(viewer: CurrentUser, zone: string, rows: number = pageSizes.adminTable): AdminSource {
  const now = new Date();
  const today = partsIn(now, zone).day;
  const stamp = (iso: string) => {
    const p = partsIn(new Date(iso), zone);
    return { when: `${p.day}T${p.time}`, at: whenLabel(`${p.day}T${p.time}`, today) };
  };
  const call = <T>(sql: string, args: unknown[]) => actingAs(viewer.id, async (db) => (await db.query(sql, args)).rows[0].out as T);

  function userRow(j: J): UserRow {
    const p = person(j.person as J)!;
    const joined = partsIn(new Date(String(j.createdAt)), zone);
    const last = new Date(String(j.lastActiveAt));
    const minutes = (now.getTime() - last.getTime()) / 60_000;
    const lastDay = partsIn(last, zone).day;
    const recency: Recency = minutes < 5 ? "now" : lastDay === today ? "today" : minutes < 7 * 24 * 60 ? "week" : "older";
    return {
      person: p,
      email: (j.email as string | null) ?? null,
      joined: whenLabel(`${joined.day}T${joined.time}`, today).replace(/, \d\d:\d\d$/, ""),
      joinedOn: joined.day,
      joinedAt: `${joined.day}T${joined.time}`,
      lastActive: { label: recency === "now" ? "Now" : agoLabel(last, now, zone), recency },
      summaries: Number(j.summaries),
      costUsd: j.costUsd === null ? null : Number(j.costUsd),
      status: j.suspended ? "suspended" : p.role === "guest" ? "guest" : "active",
    };
  }

  function activityEntry(j: J): ActivityEntry {
    const { at, when } = stamp(String(j.at));
    const kind = j.kind as ActivityKind;
    const u = j.usage as J | null;
    const usage: SummaryUsage | undefined = u
      ? {
          length: lengthWord[(u.length as keyof typeof lengthWord) ?? "medium"] ?? "Medium",
          words: Number(u.words ?? 0),
          inputTokens: u.inputTokens == null ? null : Number(u.inputTokens),
          outputTokens: u.outputTokens == null ? null : Number(u.outputTokens),
          costUsd: u.costUsd == null ? null : Number(u.costUsd),
        }
      : undefined;
    const raw = String(j.detail ?? "");
    const detail =
      kind === "summary" && usage
        ? usageLine(usage)
        : kind === "staff"
          ? staffSentence(j.audit as AuditFacts)
          : kind === "signup"
            ? "Signed up with email"
            : kind === "guest"
              ? "Started a guest session"
              : kind === "signin"
                ? "Signed in"
                : kind === "signinFailed"
                  ? "Wrong password"
                  : kind === "upgrade"
                    ? "Guest to account"
                    : kind === "delete"
                      ? `Deleted the account${raw ? ` ${raw}` : ""}`
                      : raw;
    return { id: String(j.id), at, when, kind, person: person(j.person as J), detail, place: (j.place as string) || undefined, usage };
  }

  return {
    serverReady: false,

    async overview() {
      const [o, cpu, disk] = await Promise.all([call<J>("select admin_overview($1) as out", [zone]), cpuPercent(), diskPercent()]);
      const memory = Math.round((1 - os.freemem() / os.totalmem()) * 100);
      const settings = o.settings as J;
      const pause = (p: J | null) => (p ? { since: stamp(String(p.since)).when, by: person(p.by as J)!, reason: String(p.reason ?? "") } : null);
      const summaries = (o.summaries as number[]).map(Number);
      const spendCents = (o.spendCents as number[]).map(Number);
      const failedToday = Number(o.failedToday);
      const requestsToday = (summaries.at(-1) ?? 0) + failedToday;
      const lastFailure = o.lastFailure as J | null;
      const capUsd = Number(settings.capUsd);
      const d = Number(today.slice(8, 10));
      const monthUsd = spendCents.slice(-Math.min(d, 14)).reduce((s, c) => s + c, 0) / 100;
      const dbLargest = o.largestTable as J | null;
      const serverHealth = health(cpu, memory, disk.percent);

      // Needs attention: real anomalies only (never a chosen pause or an ordinary quiet day).
      const attention: AttentionItem[] = [];
      if (monthUsd >= capUsd * 0.8) {
        attention.push({ id: "spend", kind: "spend", title: "Spend near the monthly cap", detail: `$${monthUsd.toFixed(2)} of $${capUsd.toFixed(2)} this month` });
      }
      if (requestsToday >= 5 && failedToday / requestsToday >= 0.05) {
        attention.push({ id: "errors", kind: "errors", title: "Claude requests failing", detail: `${failedToday} of ${requestsToday} requests failed today` });
      }
      if (serverHealth === "strained") {
        attention.push({ id: "server", kind: "server", title: "The server is under strain", detail: `CPU ${cpu}% · memory ${memory}% · disk ${disk.percent}%` });
      }

      const overview: AdminOverview = {
        today,
        users: { registered: Number(o.registered) },
        guests: { active: Number(o.guestsActive), today: Number(o.guestsToday), upgradedWeek: Number(o.upgradedWeek) },
        active: { now: Number(o.activeNow), week: Number(o.activeWeek) },
        spend: { capUsd, workspaceCapUsd: Number(settings.workspaceCapUsd), dailyCapUsd: Number(settings.dailyCapUsd) },
        pauses: { guests: pause(settings.guestsPaused as J | null), all: pause(settings.allPaused as J | null) },
        limitsHit: { today: Number(o.limitsHitUsers) + Number(o.limitsHitGuests), users: Number(o.limitsHitUsers), guests: Number(o.limitsHitGuests) },
        daily: { signups: (o.signups as number[]).map(Number), summaries, spendCents },
        server: {
          health: serverHealth,
          host: {
            os: `${os.type()} ${os.release()}`,
            kernel: os.release(),
            region: "",
            cpus: os.cpus().length,
            memoryGb: Math.round(os.totalmem() / 1e9),
            diskGb: disk.sizeGb,
            uptime: `${Math.floor(os.uptime() / 86400)} days`,
          },
          cpu,
          load: Math.round(os.loadavg()[0] * 100) / 100,
          memory,
          disk: disk.percent,
          series: { cpu: [], load: [], memory: [], disk: [] },
          database: {
            up: true,
            sizeMb: Number(o.dbSizeMb),
            connections: Number(o.connections),
            maxConnections: Number(o.maxConnections),
            largestTable: { name: String(dbLargest?.name ?? ""), sizeMb: Number(dbLargest?.sizeMb ?? 0) },
          },
          claude: {
            avgSeconds: Number(o.avgSeconds ?? 0),
            p95Seconds: Number(o.p95Seconds ?? 0),
            failedToday,
            lastFailure: lastFailure ? { at: stamp(String(lastFailure.at)).at, code: String(lastFailure.code).replace("claude_", "") } : null,
          },
          app: { commit: process.env.APP_COMMIT ?? "", deployedAt: "", next: "16", node: process.version },
          // Filled by the box's collector, backups and certificate (step 3); hidden until then.
          backup: null,
          security: { firewallPorts: [], bannedNow: 0, bannedToday: 0, updatesPending: 0, httpsUntil: "" },
          httpsDays: null,
        },
        attention,
      };
      return overview;
    },

    async recentNotable() {
      const kinds = ["signup", "guest", "upgrade", "signinFailed", "delete", "staff"];
      const j = await call<J>("select admin_activity($1, null, 5, 0) as out", [kinds]);
      return (j.rows as J[]).map(activityEntry);
    },

    async users(f, rawPage) {
      const first = await call<J>("select admin_users($1, $2, $3, 0, 0) as out", [f.query, f.roles, f.suspendedOnly]);
      const page = pageOf(rawPage, Number(first.total), rows);
      const j = await call<J>("select admin_users($1, $2, $3, $4, $5) as out", [f.query, f.roles, f.suspendedOnly, page.size, page.offset]);
      const counts = j.counts as J;
      const byRole = counts.roles as J;
      return {
        rows: (j.rows as J[]).map(userRow),
        page,
        counts: {
          roles: Object.fromEntries(roles.map((r) => [r, Number(byRole[r] ?? 0)])) as Record<Role, number>,
          suspended: Number(counts.suspended),
        },
      };
    },

    async userDetail(username) {
      const j = await call<J | null>("select admin_user($1, $2) as out", [username, zone]);
      if (!j) return null;
      const row = userRow(j);
      const guest = row.person.role === "guest";
      const resetAt = j.limitResetAt ? new Date(String(j.limitResetAt)) : null;
      const resetAction = (j.staffActions as J[]).find((a) => a.action === "reset_limit");
      const detail: UserDetail = {
        row,
        daily: (j.daily as number[]).map(Number),
        accountDays: Number(j.accountDays),
        hour: {
          used: Number(j.hourUsed),
          limit: Number(j.hourLimit),
          resetsAt: j.nextFreeAt ? partsIn(new Date(String(j.nextFreeAt)), zone).time : null,
          resetBy:
            resetAt && resetAction && now.getTime() - resetAt.getTime() < 3_600_000
              ? { person: person(resetAction.actor as J)!, at: partsIn(resetAt, zone).time }
              : undefined,
        },
        day: guest ? null : { used: Number(j.dayUsed), limit: 30 },
        flagged: Number(j.flagged),
        sessions: (j.sessions as J[]).map((s) => ({
          id: String(s.id),
          kind: deviceKind(String(s.os ?? "")),
          // Older sessions (and scripts) may carry no browser details; say so rather than show a bare dot.
          browser: String(s.browser || "Unknown browser"),
          os: String(s.os ?? ""),
          place: String(s.place ?? ""),
          lastSeen: agoLabel(new Date(String(s.lastSeenAt)), now, zone),
        })),
        staffActions: (j.staffActions as J[]).map((a) => ({
          id: String(a.id),
          at: stamp(String(a.at)).at,
          actor: person(a.actor as J)!,
          action: staffActionLabel(String(a.action), a.details as J | null),
          reason: String(a.reason ?? ""),
        })),
      };
      return detail;
    },

    async activity(f, rawPage) {
      const first = await call<J>("select admin_activity($1, $2, 0, 0) as out", [f.kinds, f.who]);
      const page = pageOf(rawPage, Number(first.total), rows);
      const j = await call<J>("select admin_activity($1, $2, $3, $4) as out", [f.kinds, f.who, page.size, page.offset]);
      const counts = j.counts as J;
      const kinds: ActivityKind[] = ["signup", "guest", "upgrade", "signin", "signinFailed", "summary", "delete", "staff"];
      return {
        rows: (j.rows as J[]).map(activityEntry),
        page,
        counts: Object.fromEntries(kinds.map((k) => [k, Number(counts[k] ?? 0)])) as Record<ActivityKind, number>,
      };
    },

    async spend(fromDay, rawPage) {
      // The month starts at midnight in the viewer's zone.
      const from = new Date(new Date(`${fromDay}T00:00:00Z`).getTime() - offsetMs(zone, new Date(`${fromDay}T12:00:00Z`)));
      const first = await call<J>("select admin_spend($1, 0, 0) as out", [from]);
      const page = pageOf(rawPage, Number(first.total), rows);
      const j = await call<J>("select admin_spend($1, $2, $3) as out", [from, page.size, page.offset]);
      return {
        rows: (j.rows as J[]).map((r) => ({
          person: person(r.person as J)!,
          summaries: Number(r.summaries),
          inputTokens: Number(r.inputTokens),
          outputTokens: Number(r.outputTokens),
          costUsd: Number(r.costUsd),
        })),
        page,
      };
    },

    async roles() {
      const j = await call<J>("select admin_roles() as out", []);
      return {
        holders: (j.holders as J[]).map((h) => ({
          person: person(h.person as J)!,
          since: stamp(String(h.since)).at.replace(/, \d\d:\d\d$/, ""),
          grantedBy: person(h.grantedBy as J),
        })),
        changes: (j.changes as J[]).map((c) => ({
          id: String(c.id),
          at: stamp(String(c.at)).at.replace(/, \d\d:\d\d$/, ""),
          actor: person(c.actor as J)!,
          action: c.action === "grant_role" ? ("granted" as const) : c.action === "change_role" ? ("changed" as const) : ("revoked" as const),
          role: String(c.role) as Role,
          target: person(c.target as J)!,
          reason: String(c.reason ?? ""),
        })),
      };
    },

    async suspension(username) {
      const detail = await call<J | null>("select admin_user($1, $2) as out", [username, zone]);
      const action = (detail?.staffActions as J[] | undefined)?.find((a) => a.action === "suspend");
      if (!action) return null;
      return { by: person(action.actor as J), on: stamp(String(action.at)).at, reason: String(action.reason ?? "") };
    },
  };
}

/** The zone's offset from UTC at a moment, in ms (positive east of Greenwich). */
function offsetMs(zone: string, at: Date): number {
  const p = partsIn(at, zone);
  const local = Date.UTC(p.year, p.month - 1, p.date, Number(p.time.slice(0, 2)), Number(p.time.slice(3)));
  return local - Math.floor(at.getTime() / 60_000) * 60_000;
}

