import type { ActivityEntry, AdminOverview, RoleChange, RoleHolder, UserDetail, UserRow } from "@/lib/admin";
import { people, sampleOverview, sampleOverviewTrouble } from "@/lib/sample";
import { logStart, sampleActivity } from "@/lib/sample-activity";
import { sampleUserDetail as baseDetail, sampleUsers as baseUsers } from "@/lib/sample-users";

/**
 * Puts the invented console data together the way the server will: every count, cost and "last active" for the last
 * 14 days is read from the activity log, never typed in twice. What happened before the log's first day is the only
 * thing kept from the users file (a lifetime's earlier summaries).
 */

const today = sampleOverview.today;
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const now = "12:31";
/** Average cost of a summary made before the log's window (for lifetime totals only). */
const earlierCost = 0.0034;

const summariesOf = new Map<string, ActivityEntry[]>();
const lastEventOf = new Map<string, string>();
for (const e of sampleActivity) {
  if (!e.person) continue;
  if (e.kind === "summary") summariesOf.set(e.person.id, [...(summariesOf.get(e.person.id) ?? []), e]);
  if (!lastEventOf.has(e.person.id)) lastEventOf.set(e.person.id, e.when); // the log is newest first
}

function dayLabel(when: string): string {
  const [day, time] = when.split("T");
  if (day === today) return `Today ${time}`;
  const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  if (day === yesterday) return "Yesterday";
  const [, m, d] = day.split("-").map(Number);
  return `${months[m - 1]} ${d}`;
}

/** Summaries made before the log's first day: Maya's library says 13, Kevin's last 14 days hold all 41. */
function earlierSummaries(r: UserRow): number {
  if (r.joinedOn >= logStart) return 0;
  if (r.person.id === people.maya.id) return 13;
  if (r.person.id === people.kevin.id) return 0;
  return r.summaries;
}

export const adminUsers: UserRow[] = baseUsers.map((r) => {
  const logged = summariesOf.get(r.person.id) ?? [];
  const earlier = earlierSummaries(r);
  const last = lastEventOf.get(r.person.id);
  let lastActive = r.lastActive;
  // A visit today without a logged event (a settings change, a page view) can be later than the last event; keep it.
  const keptToday = r.lastActive.recency === "today" && last?.startsWith(today) && r.lastActive.label.slice(-5) >= last.slice(11);
  if (r.lastActive.recency !== "now" && !keptToday) {
    if (last) {
      const ago = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${last.slice(0, 10)}T00:00:00Z`)) / 86_400_000);
      lastActive = { label: dayLabel(last), recency: ago === 0 ? "today" : ago < 7 ? "week" : "older" };
    } else {
      // No event in the log: their last visit was before it began.
      const before = new Date(Math.min(Date.parse(`${logStart}T00:00:00Z`) - 86_400_000, Date.parse(`${r.joinedOn}T00:00:00Z`) + 3 * 86_400_000));
      lastActive = { label: `${months[before.getUTCMonth()]} ${before.getUTCDate()}`, recency: "older" };
    }
  }
  return {
    ...r,
    summaries: earlier + logged.length,
    costUsd: earlier * earlierCost + logged.reduce((sum, e) => sum + (e.usage?.costUsd ?? 0), 0),
    lastActive,
  };
});

/** Exact cents (not rounded), so a week or a month adds up to the same total as its days. */
const dayCents = (day: string) => sampleActivity.filter((e) => e.kind === "summary" && e.when.startsWith(day)).reduce((sum, e) => sum + (e.usage?.costUsd ?? 0), 0) * 100;
const days = Array.from({ length: 14 }, (_, i) => new Date(Date.parse(`${logStart}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10));
const weekStart = days[7];
const activeWeek = new Set(sampleActivity.filter((e) => e.person && e.when >= weekStart).map((e) => e.person!.id)).size;

function withLog(o: AdminOverview): AdminOverview {
  return {
    ...o,
    active: { ...o.active, week: activeWeek },
    daily: { ...o.daily, spendCents: days.map(dayCents) },
    limitsHit: limitsReachedToday(),
  };
}

/** Accounts that made 10 (guests 5) summaries inside one hour today: read from the log, like the server would. */
function limitsReachedToday() {
  let users = 0;
  let guests = 0;
  for (const r of adminUsers) {
    const times = (summariesOf.get(r.person.id) ?? [])
      .filter((e) => e.when.startsWith(today))
      .map((e) => Number(e.when.slice(11, 13)) * 60 + Number(e.when.slice(14, 16)))
      .sort((a, b) => a - b);
    const limit = r.person.role === "guest" ? 5 : 10;
    const hit = times.some((t, i) => i + limit - 1 < times.length && times[i + limit - 1] - t < 60);
    if (hit) {
      if (r.person.role === "guest") guests++;
      else users++;
    }
  }
  return { today: users + guests, users, guests };
}

export const adminOverview = withLog(sampleOverview);
export const adminOverviewTrouble = withLog(sampleOverviewTrouble);
export const adminActivity = sampleActivity;

const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** A user's page: the users file gives sessions and staff actions; usage and limits come from the log. */
export function adminUserDetail(username: string): UserDetail | null {
  const base = baseDetail(username);
  const row = adminUsers.find((u) => u.person.username === username);
  if (!base || !row) return null;
  const logged = summariesOf.get(row.person.id) ?? [];
  const daily = days.map((d) => logged.filter((e) => e.when.startsWith(d)).length);
  // The hour counts from a staff reset if there was one, otherwise the last 60 minutes.
  const reset = sampleActivity.find((e) => e.kind === "staff" && e.when.startsWith(today) && e.detail.endsWith(`@${username}`));
  const from = reset ? toMinutes(reset.at) : toMinutes(now) - 60;
  const inHour = logged
    .filter((e) => e.when.startsWith(today) && toMinutes(e.at) > from)
    .map((e) => toMinutes(e.at))
    .sort((a, b) => a - b);
  const guest = row.person.role === "guest";
  return {
    ...base,
    row,
    daily,
    hour: {
      used: inHour.length,
      limit: guest ? 5 : 10,
      resetsAt: inHour.length > 0 ? hhmm(inHour[0] + 60) : null,
      resetBy: reset ? { person: reset.person!, at: reset.at } : undefined,
    },
    day: guest ? null : { used: daily.at(-1) ?? 0, limit: 30 },
  };
}

/** Spend for one period, per person, from the log's summaries. */
export function spendByUser(fromDay: string) {
  const rows = new Map<string, { person: NonNullable<ActivityEntry["person"]>; summaries: number; inputTokens: number; outputTokens: number; costUsd: number }>();
  for (const e of sampleActivity) {
    if (e.kind !== "summary" || !e.person || !e.usage || e.when < fromDay) continue;
    const row = rows.get(e.person.id) ?? { person: e.person, summaries: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
    row.summaries += 1;
    row.inputTokens += e.usage.inputTokens;
    row.outputTokens += e.usage.outputTokens;
    row.costUsd += e.usage.costUsd;
    rows.set(e.person.id, row);
  }
  return [...rows.values()].sort((a, b) => b.costUsd - a.costUsd || b.summaries - a.summaries);
}

const byName = (username: string) => adminUsers.find((u) => u.person.username === username)!.person;
const formerModerator = adminUsers.find((u) => u.person.role === "user" && u.joinedOn < "2026-10-05")!.person;

/** Role history from the audit log, newest first. Only the owner can grant or revoke. */
export const adminRoleChanges: RoleChange[] = [
  { id: "r5", at: "Oct 16", actor: people.jerome, action: "revoked", role: "moderator", target: formerModerator, reason: "Stepped back from moderating" },
  { id: "r4", at: "Oct 9", actor: people.jerome, action: "granted", role: "moderator", target: formerModerator, reason: "Covering weekends for a month" },
  { id: "r3", at: "Oct 8", actor: people.jerome, action: "granted", role: "moderator", target: byName("daniel_o"), reason: "Reviews spam reports" },
  { id: "r2", at: "Oct 4", actor: people.jerome, action: "granted", role: "moderator", target: people.lena, reason: "Answers support during European daytime" },
  { id: "r1", at: "Oct 2", actor: people.jerome, action: "granted", role: "admin", target: byName("hana_m"), reason: "Runs support and the daily server checks" },
];

/** Who holds each staff role now: the owner from the first sign-up, the rest from their latest grant. */
export const adminRoleHolders: RoleHolder[] = adminUsers
  .filter((u) => u.person.role === "owner" || u.person.role === "admin" || u.person.role === "moderator")
  .map((u) => {
    const grant = adminRoleChanges.find((c) => c.action === "granted" && c.target.id === u.person.id);
    return { person: u.person, since: grant?.at ?? u.joined, grantedBy: grant?.actor ?? null, order: grant ? adminRoleChanges.length - adminRoleChanges.indexOf(grant) : 0 };
  })
  // Owner first, then each role in the order it was granted.
  .sort((a, b) => ["owner", "admin", "moderator"].indexOf(a.person.role) - ["owner", "admin", "moderator"].indexOf(b.person.role) || a.order - b.order)
  .map((h) => ({ person: h.person, since: h.since, grantedBy: h.grantedBy }));
