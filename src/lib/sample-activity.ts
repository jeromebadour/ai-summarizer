import { costOf, usageLine, type ActivityEntry, type Person, type SummaryUsage, type UserRow } from "@/lib/admin";
import { people, sampleLongLibrary, sampleOverview } from "@/lib/sample";
import { sampleUsers } from "@/lib/sample-users";

/**
 * The invented activity log behind the console pictures and the demo. Every number the console shows about the last
 * 14 days is read from this log (see `sample-admin.ts`), so the screens can't disagree:
 * - each day has exactly the Overview's number of summaries and sign-ups;
 * - every summary carries its words, tokens and cost; spend per day, per user and per month is summed from them;
 * - Maya's summaries sit on the days her library says; Kevin's day hits his limit and is reset by Lena;
 * - nobody does anything before they joined, or after 12:31 today.
 */

function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const today = sampleOverview.today;
const dayMs = 86_400_000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const shift = (days: number) => iso(Date.parse(`${today}T00:00:00Z`) - days * dayMs);
/** The first day the log covers (the Overview's 14 days). */
export const logStart = shift(13);
const pad = (n: number) => String(n).padStart(2, "0");
const hm = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
const minutesOf = (label: string) => {
  const m = /(\d\d):(\d\d)$/.exec(label);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const now = 12 * 60 + 31;
const places = ["Istanbul, TR", "Berlin, DE", "Lisbon, PT", "Warsaw, PL", "Madrid, ES", "Vienna, AT", "Oslo, NO", "Lyon, FR"];
const devices = ["Chrome 142 · Windows 11", "Safari · macOS", "Firefox 145 · Linux", "Safari · iOS 19"];

/** Tokens follow the words (the prompt adds about 205), output follows the length; cost follows the tokens. */
function usageFor(words: number, length: SummaryUsage["length"], random: () => number): SummaryUsage {
  const inputTokens = Math.round(words * 1.3 + 205);
  const outputTokens = { Short: 90, Medium: 200, Bullets: 160 }[length] + Math.floor(random() * 60);
  return { length, words, inputTokens, outputTokens, costUsd: costOf(inputTokens, outputTokens) };
}

export function buildSampleActivity(): ActivityEntry[] {
  const random = seeded(11);
  const pick = <T,>(list: T[]) => list[Math.floor(random() * list.length)];
  const between = (from: number, to: number) => from + Math.floor(random() * Math.max(1, to - from));
  const log: ActivityEntry[] = [];
  let id = 0;
  const placeOf = new Map<string, string>([
    [people.maya.id, "Istanbul, TR"],
    [people.kevin.id, "Berlin, DE"],
    [people.lena.id, "Vienna, AT"],
    [people.jerome.id, "Istanbul, TR"],
  ]);
  const placeFor = (p: Person) => {
    if (!placeOf.has(p.id)) placeOf.set(p.id, pick(places));
    return placeOf.get(p.id)!;
  };
  const add = (day: string, minutes: number, kind: ActivityEntry["kind"], person: Person | null, detail: string, usage?: SummaryUsage) =>
    log.push({ id: `e${++id}`, at: hm(minutes), when: `${day}T${hm(minutes)}`, kind, person, detail, place: person ? placeFor(person) : pick(places), usage });
  const summary = (day: string, minutes: number, person: Person, words?: number, length?: SummaryUsage["length"]) => {
    const u = usageFor(words ?? 300 + Math.floor(random() * 2700), length ?? pick(["Short", "Medium", "Bullets"] as const), random);
    add(day, minutes, "summary", person, usageLine(u), u);
  };
  const joinMinute = (r: UserRow) => {
    const [h, m] = r.joinedAt.slice(11).split(":").map(Number);
    return h * 60 + m;
  };
  const lastMinute = (r: UserRow) => (r.lastActive.recency === "now" ? now - 1 : (minutesOf(r.lastActive.label) ?? now - 1));
  const countOn = (day: string) => log.filter((e) => e.kind === "summary" && e.when.startsWith(day)).length;

  // ---- People whose days are spelled out.
  // Maya: her summaries sit on the days her library says (today at 10:07 and 11:52).
  const mayaTimes: Record<string, number> = { a1: 11 * 60 + 52, a2: 10 * 60 + 7 };
  for (const item of sampleLongLibrary.filter((i) => i.date >= logStart)) {
    const length = ({ short: "Short", medium: "Medium", bullets: "Bullets" } as const)[item.length];
    summary(item.date, mayaTimes[item.id] ?? between(9 * 60, 21 * 60), people.maya, item.wordsIn, length);
  }
  add(today, 9 * 60 + 48, "signin", people.maya, "Safari · iOS 19");

  // Kevin: his last 14 days; today ten inside one hour hit his limit at 11:40, Lena reset it at 12:20, three more since.
  const kevinDays = [3, 2, 0, 4, 1, 3, 2, 0, 5, 1, 2, 3, 2];
  kevinDays.forEach((count, index) => {
    for (let n = 0; n < count; n++) summary(shift(13 - index), between(9 * 60, 20 * 60), people.kevin);
  });
  add(today, 8 * 60 + 15, "signin", people.kevin, "Edge 142 · Windows 11");
  [10 * 60 + 41, 10 * 60 + 47, 10 * 60 + 52, 10 * 60 + 58, 11 * 60 + 4, 11 * 60 + 11, 11 * 60 + 18, 11 * 60 + 26, 11 * 60 + 33, 11 * 60 + 40].forEach((m) =>
    summary(today, m, people.kevin),
  );
  add(today, 12 * 60 + 20, "staff", people.lena, `Reset the hourly limit of @${people.kevin.username}`);
  [12 * 60 + 21, 12 * 60 + 22, 12 * 60 + 24].forEach((m) => summary(today, m, people.kevin));

  // Staff on duty, two refused sign-ins, a suspension earlier in the week.
  add(today, 8 * 60 + 5, "signin", people.jerome, "Chrome 142 · Windows 11");
  add(today, 8 * 60 + 40, "signin", people.lena, "Firefox 145 · Linux");
  add(today, 12 * 60 + 14, "signinFailed", null, "Unknown username · 2 tries");
  add(today, 7 * 60 + 2, "signinFailed", null, "Wrong password for @hana_m · 1 try");
  const hana = sampleUsers.find((u) => u.person.username === "hana_m")!.person;
  add(today, 7 * 60 + 6, "passwordReset", hana, "Set a new password from Forgot password");
  const suspended = sampleUsers.find((u) => u.status === "suspended")!;
  add(shift(3), 16 * 60 + 5, "staff", people.lena, `Suspended @${suspended.person.username} · posting spam through shared links`);

  // ---- Everyone who joined today: their whole history is today.
  for (const r of sampleUsers.filter((u) => u.joinedOn === today)) {
    const start = joinMinute(r);
    if (r.person.id === people.oliver.id) {
      add(today, start, "guest", r.person, "Started a guest session");
      [10 * 60 + 52, 11 * 60 + 30, 12 * 60 + 11].forEach((m) => summary(today, m, r.person));
      add(today, 12 * 60 + 28, "upgrade", r.person, "Guest to account · kept 3 summaries");
      add(today, 12 * 60 + 29, "emailConfirmed", r.person, "Confirmed their email");
      continue;
    }
    const guest = r.person.role === "guest";
    add(today, start, guest ? "guest" : "signup", r.person, guest ? "Started a guest session" : "Signed up with email");
    if (!guest) add(today, start + 1, "emailConfirmed", r.person, "Confirmed their email");
    const end = lastMinute(r);
    for (let n = 0; n < r.summaries; n++) summary(today, n === r.summaries - 1 ? end : Math.min(end, between(start + 1, end)), r.person);
  }

  // ---- The rest of today: accounts that were active today, each within their own day.
  const staffAndNamed = [people.maya.id, people.kevin.id, people.lena.id, people.jerome.id];
  const todayPool = sampleUsers.filter(
    (r) => r.joinedOn < today && (r.lastActive.recency === "now" || r.lastActive.recency === "today") && !staffAndNamed.includes(r.person.id) && r.person.role !== "guest" && r.status !== "suspended",
  );
  for (let i = 0; countOn(today) < (sampleOverview.daily.summaries.at(-1) ?? 0); i++) {
    const r = todayPool[i % todayPool.length];
    const end = lastMinute(r);
    if (i < todayPool.length) add(today, between(7 * 60, end - 20), "signin", r.person, pick(devices));
    summary(today, i < todayPool.length ? end : between(8 * 60, end), r.person);
  }

  // ---- Earlier days: the Overview's daily counts, from people who already had an account (or guest session) then.
  const keptThisWeek = new Set(
    sampleUsers
      .filter((u) => u.person.role === "user" && u.joinedOn >= shift(6) && u.joinedOn < today)
      .slice(0, sampleOverview.guests.upgradedWeek - 1)
      .map((u) => u.person.id),
  );
  const regulars = new Set(sampleUsers.filter((u) => u.person.role === "user" && random() < 0.22).map((u) => u.person.id));
  for (let ago = 1; ago <= 13; ago++) {
    const day = shift(ago);
    const index = 13 - ago;
    for (const r of sampleUsers.filter((u) => u.joinedOn === day)) {
      const guest = r.person.role === "guest";
      if (keptThisWeek.has(r.person.id)) {
        const kept = 1 + Math.floor(random() * 3);
        add(day, Math.max(7 * 60, joinMinute(r) - 50), "guest", r.person, "Started a guest session");
        for (let n = 0; n < kept; n++) summary(day, Math.max(7 * 60 + 1, joinMinute(r) - 40 + n * 10), r.person);
        add(day, joinMinute(r), "upgrade", r.person, `Guest to account · kept ${kept} ${kept === 1 ? "summary" : "summaries"}`);
        add(day, Math.min(joinMinute(r) + 1, 23 * 60 + 59), "emailConfirmed", r.person, "Confirmed their email");
        continue;
      }
      add(day, joinMinute(r), guest ? "guest" : "signup", r.person, guest ? "Started a guest session" : "Signed up with email");
      if (!guest) add(day, Math.min(joinMinute(r) + 1, 23 * 60 + 59), "emailConfirmed", r.person, "Confirmed their email");
    }
    // Suspended accounts do nothing in the log (one was suspended four days ago, before that they were quiet).
    const existing = sampleUsers.filter((u) => u.joinedOn <= day && u.status !== "suspended" && !staffAndNamed.slice(0, 2).includes(u.person.id));
    // Most summaries come from a core of regulars; the rest from anyone who had an account then.
    const usual = existing.filter((u) => regulars.has(u.person.id));
    while (countOn(day) < sampleOverview.daily.summaries[index]) {
      const r = usual.length > 0 && random() < 0.8 ? pick(usual) : pick(existing);
      const from = r.joinedOn === day ? Math.min(joinMinute(r) + 2, 23 * 60 - 1) : 7 * 60;
      summary(day, between(from, 23 * 60), r.person);
    }
    const accounts = existing.filter((u) => u.person.role !== "guest");
    const usualAccounts = accounts.filter((u) => regulars.has(u.person.id));
    for (let n = 0; n < 6 + Math.floor(random() * 8); n++) add(day, between(7 * 60, 22 * 60), "signin", (usualAccounts.length > 0 && random() < 0.8 ? pick(usualAccounts) : pick(accounts)).person, pick(devices));
    if (random() < 0.5) add(day, between(0, 23 * 60), "signinFailed", null, pick(["Unknown username · 3 tries", "Wrong password · 1 try", "Unknown email · 1 try"]));
    if (ago % 4 === 2) add(day, between(9 * 60, 21 * 60), "delete", null, `Account deleted by its owner · ${2 + Math.floor(random() * 20)} summaries removed`);
  }

  return log.sort((a, b) => b.when.localeCompare(a.when) || Number(b.id.slice(1)) - Number(a.id.slice(1)));
}

export const sampleActivity = buildSampleActivity();
