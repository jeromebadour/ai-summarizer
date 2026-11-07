import type { Person, Recency, UserDetail, UserRow } from "@/lib/admin";
import type { AvatarColour } from "@/lib/profile";
import { people, sampleOverview, sampleStats } from "@/lib/sample";

/**
 * Invented users for the console pictures and the public demo. Built from a fixed seed, so every render is the same,
 * and shaped to agree with the Overview: 128 accounts, 37 guests, the 14-day sign-up chart, 6 active now.
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

const first = ["Aylin", "Ben", "Carla", "Dario", "Elif", "Felix", "Greta", "Hugo", "Ines", "Jonas", "Kenji", "Lucia", "Marco", "Nora", "Oskar", "Priya", "Rafael", "Selin", "Tomas", "Uma", "Vera", "Yannick", "Zeynep", "Adam", "Bianca", "Can", "Daphne", "Emre", "Freya", "Kai"];
const last = ["Arslan", "Novak", "Rossi", "Lindqvist", "Demir", "Hoffmann", "Moreau", "Kovac", "Silva", "Brandt", "Tanaka", "Yilmaz", "Costa", "Weber", "Nilsson", "Okafor", "Petrov", "Aydin", "Larsen", "Ferreira"];
const colours: AvatarColour[] = ["indigo", "teal", "sage", "sand", "plum", "rose", "steel"];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const today = sampleOverview.today;
const dayMs = 86_400_000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const shift = (days: number) => iso(Date.parse(`${today}T00:00:00Z`) - days * dayMs);
const label = (day: string, time: string) => {
  if (day === today) return `Today ${time}`;
  if (day === shift(1)) return `Yesterday ${time}`;
  const [, m, d] = day.split("-").map(Number);
  return `${months[m - 1]} ${d}`;
};
const pad = (n: number) => String(n).padStart(2, "0");

export function buildSampleUsers(): UserRow[] {
  const random = seeded(7);
  const pick = <T,>(list: T[]) => list[Math.floor(random() * list.length)];
  const used = new Set<string>(["maya_k", "oliver_h", "lena_s", "noahb", "jerome", "hana_m", "daniel_o", "kevin_n"]);
  let nextId = 20;

  const invent = (role: Person["role"]): Person => {
    for (;;) {
      const f = pick(first);
      const l = pick(last);
      const username = `${f}_${l.slice(0, 1)}`.toLowerCase() + (random() < 0.3 ? String(Math.floor(random() * 90) + 10) : "");
      if (used.has(username)) continue;
      used.add(username);
      return { id: `u${nextId++}`, name: `${f} ${l}`, username, avatarColour: pick(colours), role };
    }
  };
  // Last active is never before they joined, and never after the console's "now" (12:31).
  const recencyFor = (day: string, time: string): { label: string; recency: Recency } => {
    const r = random();
    if (day === today) {
      const [h, m] = time.split(":").map(Number);
      const start = h * 60 + m;
      const at = start + Math.floor(random() * Math.max(0, 12 * 60 + 25 - start));
      return { label: `Today ${pad(Math.floor(at / 60))}:${pad(at % 60)}`, recency: "today" };
    }
    if (r < 0.2) return { label: `Today ${pad(8 + Math.floor(random() * 4))}:${pad(Math.floor(random() * 60))}`, recency: "today" };
    const since = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / dayMs);
    const ago = 1 + Math.floor(random() * since);
    return { label: label(shift(ago), ""), recency: ago < 7 ? "week" : "older" };
  };
  const row = (person: Person, day: string, time: string, extra: Partial<UserRow> = {}): UserRow => {
    const guest = person.role === "guest";
    const summaries = guest ? Math.floor(random() * 5) : Math.floor(random() * random() * 45);
    return {
      person,
      email: guest ? null : `${person.username.replace(/_/g, ".")}@example.com`,
      joined: label(day, time),
      joinedOn: day,
      joinedAt: `${day}T${time || "12:00"}`,
      lastActive: recencyFor(day, time),
      summaries,
      costUsd: Math.round(summaries * 0.0016 * 10000) / 10000,
      status: guest ? "guest" : "active",
      ...extra,
    };
  };

  const rows: UserRow[] = [];
  // Accounts from the 14-day sign-up chart (oldest first), with the people other screens already show.
  sampleOverview.daily.signups.forEach((count, index) => {
    const day = shift(13 - index);
    for (let n = 0; n < count; n++) {
      if (day === today && n === 0) {
        rows.push(row(people.oliver, day, "10:41", { lastActive: { label: "Now", recency: "now" }, summaries: 3, costUsd: 0.0048 }));
      } else if (day === today && n === 1) {
        rows.push(row(people.noah, day, "12:09", { lastActive: { label: "Today 12:09", recency: "today" }, summaries: 0, costUsd: 0 }));
      } else {
        rows.push(row(invent("user"), day, `${pad(9 + n)}:${pad(Math.floor(random() * 60))}`));
      }
    }
  });
  // Older accounts, from the launch on Sep 28 to Oct 24.
  const older = sampleOverview.users.registered - rows.length;
  const named: [Person, string, Partial<UserRow>][] = [
    [people.jerome, "2026-09-28", { lastActive: { label: "Now", recency: "now" } }],
    [{ id: "u3", name: "Hana Mori", username: "hana_m", avatarColour: "sage", role: "admin" }, "2026-09-30", {}],
    [people.maya, "2026-10-01", { lastActive: { label: "Today 11:53", recency: "today" }, summaries: sampleStats.summaries, costUsd: 0.0432 }],
    [people.lena, "2026-10-03", { lastActive: { label: "Now", recency: "now" } }],
    [{ id: "u5", name: "Daniel Ortiz", username: "daniel_o", avatarColour: "rose", role: "moderator" }, "2026-10-06", {}],
    // Reached his hourly limit today; Lina reset it at 12:20 (the Overview's latest activity says the same).
    [people.kevin, "2026-10-12", { lastActive: { label: "Today 12:24", recency: "today" }, summaries: 41, costUsd: 0.0656 }],
  ];
  for (let n = 0; n < older; n++) {
    const day = iso(Date.parse("2026-09-28T00:00:00Z") + Math.floor((n / older) * 27) * dayMs);
    const known = named.find(([, d], k) => d === day && !rows.some((r) => r.person.id === named[k][0].id));
    // Older days show only the date; the hidden time keeps the order stable (the owner signed up first).
    const time = `${pad(9 + (n % 9))}:${pad((n * 13) % 60)}`;
    if (known) rows.push(row(known[0], day, known[0].role === "owner" ? "08:12" : time, known[2]));
    else rows.push(row(invent("user"), day, time));
  }
  // Two suspended accounts and three more people active right now.
  const plain = rows.filter((r) => r.person.role === "user" && r.person.id.startsWith("u") && Number(r.person.id.slice(1)) >= 20);
  plain[40].status = "suspended";
  plain[71].status = "suspended";
  [plain[3], plain[17], plain[55]].forEach((r) => (r.lastActive = { label: "Now", recency: "now" }));
  // Guests: 9 started today, the rest over the last six days.
  for (let n = 0; n < sampleOverview.guests.active; n++) {
    const day = n < sampleOverview.guests.today ? today : shift(1 + (n % 6));
    const id = n === 0 ? 31 : 31 + n;
    const person: Person = n === 0 ? people.guest : { id: `g${id}`, name: `Guest ${id}`, username: `guest-${id}`, avatarColour: "steel", role: "guest" };
    rows.push(row(person, day, `${pad(8 + (n % 4))}:${pad((n * 7) % 60)}`, n === 0 ? { lastActive: { label: "Today 12:02", recency: "today" } } : {}));
  }
  // Newest first, the table's order (the database sorts the same way: created_at desc, id desc).
  return rows.sort((a, b) => b.joinedAt.localeCompare(a.joinedAt) || b.person.id.localeCompare(a.person.id));
}

export const sampleUsers = buildSampleUsers();

/** The detail view for one invented user. Maya and Kevin are spelled out; everyone else is derived from their row. */
export function sampleUserDetail(username: string): UserDetail | null {
  const row = sampleUsers.find((u) => u.person.username === username);
  if (!row) return null;
  const accountDays = Math.max(1, Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${row.joinedOn}T00:00:00Z`)) / dayMs) + 1);
  const guest = row.person.role === "guest";

  if (username === people.maya.username) {
    return {
      row,
      daily: sampleStats.daily,
      accountDays: sampleStats.accountDays,
      hour: { used: 1, limit: 10, resetsAt: "12:52" },
      day: { used: 2, limit: 30 },
      flagged: sampleStats.figuresFlagged,
      sessions: [
        { id: "s1", kind: "desktop", browser: "Chrome 142", os: "Windows 11", place: "Istanbul, TR", lastSeen: "Today 11:53" },
        { id: "s2", kind: "phone", browser: "Safari", os: "iOS 19", place: "Istanbul, TR", lastSeen: "Today 09:51" },
        { id: "s3", kind: "laptop", browser: "Firefox 145", os: "macOS", place: "Ankara, TR", lastSeen: "Nov 3" },
      ],
      staffActions: [],
    };
  }
  if (username === people.kevin.username) {
    return {
      row,
      daily: [3, 2, 0, 4, 1, 3, 2, 0, 5, 1, 2, 3, 2, 13],
      accountDays,
      hour: { used: 3, limit: 10, resetsAt: "13:20", resetBy: { person: people.lena, at: "12:20" } },
      day: { used: 13, limit: 30 },
      flagged: 1,
      sessions: [{ id: "k1", kind: "laptop", browser: "Edge 142", os: "Windows 11", place: "Berlin, DE", lastSeen: "Today 12:24" }],
      staffActions: [
        { id: "a9", at: "Today 12:20", actor: people.lena, action: "Reset the hourly limit", reason: "Preparing a client report on a deadline; asked in support" },
      ],
    };
  }
  // Everyone else: the row's summaries spread over the days they have had the account.
  const span = Math.min(14, accountDays);
  const daily = Array<number>(14).fill(0);
  for (let i = 0; i < row.summaries; i++) daily[13 - (i % span)] += 1;
  return {
    row,
    daily,
    accountDays,
    hour: { used: 0, limit: guest ? 5 : 10, resetsAt: null },
    day: guest ? null : { used: daily[13], limit: 30 },
    flagged: 0,
    sessions: [{ id: `${row.person.id}-s`, kind: "desktop", browser: "Chrome 142", os: "Windows 11", place: "Unknown", lastSeen: row.lastActive.label }],
    staffActions: [],
  };
}
