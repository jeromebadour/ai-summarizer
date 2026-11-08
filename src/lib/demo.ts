import { isNotable, whenLabel, type ActivityKind } from "@/lib/admin";
import type { AdminSource } from "@/lib/admin-source";
import { pageOf, pageSizes } from "@/lib/paging";
import { roles, type Role } from "@/lib/permissions";
import { adminActivity, adminOverview, adminRoleChanges, adminRoleHolders, adminUserDetail, adminUsers, spendByUser } from "@/lib/sample-admin";

/**
 * The public admin demo's answers: invented people and numbers only, filtered and paged the same way the live
 * console's database does it. This module must never import the database client or read anything from the live
 * app; the demo route imports nothing else.
 */
export function demoSource(rows: number = pageSizes.adminTable, activityRows: number = rows): AdminSource {
  return {
    serverReady: async () => true,

    async overview() {
      return adminOverview;
    },

    async recentNotable() {
      return adminActivity.filter(isNotable).slice(0, 5);
    },

    async users(f, rawPage) {
      const q = f.query.toLowerCase().replace(/^@/, "");
      const matched = adminUsers.filter(
        (u) => !q || u.person.name.toLowerCase().includes(q) || u.person.username.includes(q) || (u.email ?? "").includes(q),
      );
      const filtered = matched.filter((u) => (f.roles.length === 0 || f.roles.includes(u.person.role)) && (!f.suspendedOnly || u.status === "suspended"));
      const page = pageOf(rawPage, filtered.length, rows);
      return {
        rows: filtered.slice(page.offset, page.offset + page.size),
        page,
        counts: {
          roles: Object.fromEntries(roles.map((r) => [r, matched.filter((u) => u.person.role === r).length])) as Record<Role, number>,
          suspended: matched.filter((u) => u.status === "suspended").length,
        },
      };
    },

    async userDetail(username) {
      return adminUserDetail(username);
    },

    async activity(f, rawPage) {
      const who = f.who.toLowerCase().replace(/^@/, "");
      const picked = adminActivity.filter((e) => (f.kinds.length === 0 || f.kinds.includes(e.kind)) && (!who || e.person?.username === who));
      const page = pageOf(rawPage, picked.length, activityRows);
      const kinds: ActivityKind[] = ["signup", "guest", "upgrade", "signin", "signinFailed", "emailConfirmed", "passwordReset", "summary", "delete", "staff"];
      return {
        rows: picked.slice(page.offset, page.offset + page.size),
        page,
        counts: Object.fromEntries(kinds.map((k) => [k, adminActivity.filter((e) => e.kind === k).length])) as Record<ActivityKind, number>,
      };
    },

    async spend(fromDay, rawPage) {
      const all = spendByUser(fromDay);
      const page = pageOf(rawPage, all.length, rows);
      return { rows: all.slice(page.offset, page.offset + page.size), page };
    },

    async roles() {
      // The latest 5, like the live preview; Activity holds them all.
      return { holders: adminRoleHolders, changes: adminRoleChanges.slice(0, 5) };
    },

    async suspension(username) {
      const event = adminActivity.find((e) => e.kind === "staff" && e.detail.startsWith(`Suspended @${username}`));
      if (!event?.person) return null;
      return { by: event.person, on: whenLabel(event.when, adminOverview.today), reason: event.detail.split(" · ")[1] ?? "" };
    },
  };
}
