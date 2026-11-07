import type { ActivityEntry, ActivityKind, AdminOverview, Person, RoleChange, RoleHolder, UserDetail, UserRow } from "@/lib/admin";
import type { Page } from "@/lib/paging";
import { roles, type Role } from "@/lib/permissions";

/**
 * What the console asks, one question per tab. The live console answers from the database (one page at a time,
 * filtered and counted there); the public demo answers the same questions from its invented data. The console frame
 * (AdminShell) only ever talks to this, so live and demo can never drift apart.
 */
export type SpendRow = { person: Person; summaries: number; inputTokens: number; outputTokens: number; costUsd: number };
export type UserFilters = { query: string; roles: Role[]; suspendedOnly: boolean };
export type ActivityFilters = { kinds: ActivityKind[]; who: string };
export type UserCounts = { roles: Record<Role, number>; suspended: number };

export type AdminSource = {
  overview(): Promise<AdminOverview>;
  /** The Overview's preview: the 5 newest account and staff events. */
  recentNotable(): Promise<ActivityEntry[]>;
  users(filters: UserFilters, rawPage: string | string[] | undefined): Promise<{ rows: UserRow[]; page: Page; counts: UserCounts }>;
  userDetail(username: string): Promise<UserDetail | null>;
  activity(filters: ActivityFilters, rawPage: string | string[] | undefined): Promise<{ rows: ActivityEntry[]; page: Page; counts: Record<ActivityKind, number> }>;
  /** This month's spend per person, most first. */
  spend(fromDay: string, rawPage: string | string[] | undefined): Promise<{ rows: SpendRow[]; page: Page }>;
  roles(): Promise<{ holders: RoleHolder[]; changes: RoleChange[] }>;
  /** Who suspended this person, when and why (for Restore). */
  suspension(username: string): Promise<{ by: Person; on: string; reason: string } | null>;
  /** False until the box's collector, backups and certificate exist: the Server tab and those lines stay hidden. */
  serverReady: boolean;
};

const activityKindList: ActivityKind[] = ["signup", "guest", "upgrade", "signin", "signinFailed", "summary", "delete", "staff"];
type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export function userFiltersFrom(params: Params): UserFilters {
  const picked = one(params.role).split(",").filter((r): r is Role => (roles as readonly string[]).includes(r));
  return { query: one(params.q).trim().slice(0, 100), roles: [...new Set(picked)], suspendedOnly: one(params.suspended) === "1" };
}

export function activityFiltersFrom(params: Params): ActivityFilters {
  const picked = one(params.kind).split(",").filter((k): k is ActivityKind => activityKindList.includes(k as ActivityKind));
  return { kinds: [...new Set(picked)], who: one(params.who).trim().slice(0, 40) };
}

/** A console tab's URL with its filters and page; empty filters and page 1 are left out. */
export function usersHref(base: string, f: UserFilters, page = 1): string {
  const p = new URLSearchParams({ tab: "users" });
  if (f.query) p.set("q", f.query);
  if (f.roles.length) p.set("role", f.roles.join(","));
  if (f.suspendedOnly) p.set("suspended", "1");
  if (page > 1) p.set("page", String(page));
  return `${base}?${p}`;
}

export function activityHref(base: string, f: ActivityFilters, page = 1): string {
  const p = new URLSearchParams({ tab: "activity" });
  if (f.who) p.set("who", f.who);
  if (f.kinds.length) p.set("kind", f.kinds.join(","));
  if (page > 1) p.set("page", String(page));
  return `${base}?${p}`;
}
