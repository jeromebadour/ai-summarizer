import "server-only";
import { notFound, redirect } from "next/navigation";
import { isStaff } from "@/lib/permissions";
import { statsFromLibrary, type Account, type AvatarColour, type DeviceKind, type ProfileStats, type SignedInDevice } from "@/lib/profile";
import { actingAs } from "./db";
import { currentUser, thisSessionHash, type CurrentUser } from "./session";
import { agoLabel, monthYear, partsIn, viewerZone } from "./zone";

/** The signed-in user, or off to /login. Every signed-in page starts here. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  // An account whose email isn't confirmed waits on /verify (migration 012); guests have nothing to confirm.
  if (!user.emailVerified) redirect("/verify");
  return user;
}

/** The signed-in user as the rail and pages show them, or off to /login. */
export async function requireAccount(): Promise<{ user: CurrentUser; account: Account }> {
  const user = await requireUser();
  return { user, account: toAccount(user, await viewerZone()) };
}

/** Staff only; everyone else gets the same 404 as a page that doesn't exist. */
export async function requireStaff(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!isStaff(user.role)) notFound();
  return user;
}

export function toAccount(user: CurrentUser, zone: string): Account {
  const p = partsIn(user.createdAt, zone);
  return {
    name: user.name,
    username: user.username,
    email: user.email ?? "",
    avatarColour: user.avatarColour as AvatarColour,
    memberSince: user.isGuest ? `today ${p.time}` : monthYear(user.createdAt, zone),
    isGuest: user.isGuest,
    role: user.role,
    theme: user.theme,
    motion: user.motion,
    links: user.links,
    resultView: user.resultView,
  };
}

export type Quota = { used: number; limit: number; resetsAt: string; dayUsed?: number; dayLimit?: number };

export type ProfileData = {
  account: Account;
  stats: ProfileStats;
  devices: SignedInDevice[];
  passwordChanged: string;
  quota: Quota;
};

function deviceKind(os: string): DeviceKind {
  if (os === "iOS" || os === "Android") return "phone";
  if (os === "macOS" || os === "ChromeOS") return "laptop";
  return "desktop";
}

export async function loadQuota(db: Parameters<Parameters<typeof actingAs>[1]>[0], user: CurrentUser, zone: string): Promise<Quota> {
  const q = (await db.query("select * from quota_now($1)", [user.id])).rows[0];
  const resetsAt = q.next_free_at ? partsIn(q.next_free_at, zone).time : "";
  // Guests share their daily pool with every other guest, so their ring shows the hour only.
  return user.isGuest
    ? { used: q.used_hour, limit: q.limit_hour, resetsAt }
    : { used: q.used_hour, limit: q.limit_hour, resetsAt, dayUsed: q.used_day, dayLimit: q.limit_day };
}

/** Everything the Profile page shows, read in one transaction as the user. */
export async function loadProfile(user: CurrentUser): Promise<ProfileData> {
  const zone = await viewerZone();
  const here = await thisSessionHash();
  return actingAs(user.id, async (db) => {
    const now = new Date();
    const me = (await db.query("select created_at, password_changed_at from users")).rows[0];
    const today = partsIn(now, zone).day;
    const created = partsIn(me.created_at, zone).day;
    const accountDays = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${created}T00:00:00Z`)) / 86_400_000) + 1;

    // Only the light columns: the stats never need the text.
    const rows = (
      await db.query(
        `select length, words_in, words_out, figure_status, jsonb_array_length(figures) as figures, created_at
         from summaries order by created_at`,
      )
    ).rows;
    const stats = statsFromLibrary(
      rows.map((r) => ({
        length: r.length,
        wordsIn: r.words_in,
        wordsOut: r.words_out,
        figureStatus: r.figure_status,
        keyFigures: { length: r.figures },
        date: partsIn(r.created_at, zone).day,
      })),
      today,
      accountDays,
    );

    const sessions = (
      await db.query("select id, token_hash, browser, os, place, last_seen_at from sessions where expires_at > now() order by last_seen_at desc")
    ).rows;
    const devices: SignedInDevice[] = sessions.map((s) => {
      const current = here !== null && Buffer.compare(s.token_hash, here) === 0;
      return {
        id: String(s.id),
        kind: deviceKind(s.os),
        browser: s.browser,
        os: s.os,
        place: s.place,
        lastActive: current ? "Now" : agoLabel(s.last_seen_at, now, zone),
        current,
      };
    });
    // This device first, then the most recently used.
    devices.sort((a, b) => Number(b.current) - Number(a.current));

    return {
      account: toAccount(user, zone),
      stats,
      devices,
      passwordChanged: me.password_changed_at ? agoLabel(me.password_changed_at, now, zone).replace("Now", "just now") : "never",
      quota: await loadQuota(db, user, zone),
    };
  });
}
