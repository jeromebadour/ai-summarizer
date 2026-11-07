"use server";

import { redirect } from "next/navigation";
import { can, type Permission, type Role } from "@/lib/permissions";
import { requireStaff } from "@/lib/server/account";
import { actingAs } from "@/lib/server/db";
import { text, type FormState } from "@/lib/server/rules";
import type { Person } from "@/lib/admin";

/**
 * Staff actions. The page only shows what a role holds; this checks the matrix again, and the database checks it a
 * third time (migration 008) along with who may act on whom, the reason, and the audit row, all in one transaction.
 * On success the console comes back without the dialog, and the header says what was just done.
 */

type Input = { username: string; reason: string; role: string; monthly: string | null; daily: string | null };

/** Each action: the permission it needs, and its one database call with exactly the arguments that call takes. */
const kinds = {
  suspend: { needs: "users.suspend", sql: "select staff_suspend($1, $2) as ok", args: (i: Input) => [i.username, i.reason] },
  restore: { needs: "users.suspend", sql: "select staff_restore($1, $2) as ok", args: (i: Input) => [i.username, i.reason] },
  signout: { needs: "users.signOut", sql: "select staff_sign_out_all($1, $2) as ok", args: (i: Input) => [i.username, i.reason] },
  reset: { needs: "users.resetLimit", sql: "select staff_reset_limit($1, $2) as ok", args: (i: Input) => [i.username, i.reason] },
  role: { needs: "roles.change", sql: "select staff_set_role($1, $2::user_role, $3) as ok", args: (i: Input) => [i.username, i.role, i.reason] },
  cap: { needs: "limits.change", sql: "select staff_set_caps($1::numeric, $2::numeric, $3) as ok", args: (i: Input) => [i.monthly, i.daily, i.reason] },
  "pause-guests": { needs: "summaries.pause", sql: "select set_pause('guests', true, $1) as ok", args: (i: Input) => [i.reason] },
  "pause-all": { needs: "summaries.pause", sql: "select set_pause('all', true, $1) as ok", args: (i: Input) => [i.reason] },
  "resume-guests": { needs: "summaries.pause", sql: "select set_pause('guests', false, $1) as ok", args: (i: Input) => [i.reason] },
  "resume-all": { needs: "summaries.pause", sql: "select set_pause('all', false, $1) as ok", args: (i: Input) => [i.reason] },
} as const satisfies Record<string, { needs: Permission; sql: string; args: (i: Input) => unknown[] }>;
type Kind = keyof typeof kinds;

/** What the database's refusals mean, in the console's words (the field they belong to, when there is one). */
const refusals: Record<string, { error: string; field?: string }> = {
  "staff: a reason is required": { field: "reason", error: "Give a reason, in a few words" },
  "staff: the reason is too long": { field: "reason", error: "Keep the reason under 200 characters" },
  "staff: not above your role": { error: "You can only act on people below your role" },
  "staff: not on yourself": { error: "This can't be done to your own account" },
  "staff: no such account": { error: "That account no longer exists" },
  "staff: not allowed": { error: "Your role no longer allows this" },
  "staff: guests cannot hold a role": { error: "Guests can't hold a role: they need an account first" },
  "staff: restore them first": { error: "Restore the account before giving it a staff role" },
  "staff: not a role you can give": { error: "Pick Admin, Moderator or User" },
  "staff: monthly cap out of range": { field: "monthly", error: "The monthly cap must sit between this month's spend and the Anthropic limit" },
  "staff: daily cap out of range": { field: "daily", error: "The daily cap must sit between today's spend and the monthly cap" },
};

/** What "nothing changed" means for each action: it was already done, maybe by someone else a moment ago. */
const nothing: Record<Kind, string> = {
  suspend: "Already suspended: nothing changed",
  restore: "Already restored: nothing changed",
  signout: "Not signed in anywhere: nothing to sign out",
  reset: "Nothing used this hour: nothing to reset",
  role: "They already hold that role",
  cap: "Those are the caps already",
  "pause-guests": "Guests are already paused",
  "pause-all": "All summaries are already paused",
  "resume-guests": "Guests are already running",
  "resume-all": "Summaries are already running",
};

/** "12.5" and "$12.50" both read as 12.50; anything else is not a number of dollars. */
function dollars(raw: string): string | null {
  const v = raw.trim().replace(/^\$/, "");
  return /^\d{1,6}(\.\d{1,2})?$/.test(v) ? v : null;
}

export async function staffAction(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await requireStaff();
  const kind = text(form, "kind") as Kind;
  if (!(kind in kinds) || !can(viewer.role, kinds[kind].needs)) return { error: "Your role no longer allows this" };

  const username = text(form, "user");
  const reason = text(form, "reason");
  const role = text(form, "role");
  const monthly = kind === "cap" ? dollars(text(form, "monthly")) : null;
  const daily = kind === "cap" ? dollars(text(form, "daily")) : null;
  if (kind === "cap" && !monthly) return { field: "monthly", error: "Write the monthly cap in dollars, like 40.00" };
  if (kind === "cap" && !daily) return { field: "daily", error: "Write the daily cap in dollars, like 3.00" };
  if (reason.trim().length < 3) return refusals["staff: a reason is required"];

  let ok: boolean;
  try {
    const args = kinds[kind].args({ username, reason, role, monthly, daily });
    ok = await actingAs(viewer.id, async (db) => (await db.query(kinds[kind].sql, args)).rows[0].ok === true);
  } catch (error) {
    const known = refusals[(error as { message?: string }).message ?? ""];
    if (known) return known;
    // Never a silent failure: the dialog says so, and the server log keeps the cause.
    console.error("staff action failed", kind, error);
    return { error: "Couldn't save: nothing changed. Try again in a moment" };
  }
  if (!ok) return { code: "nothing", error: nothing[kind] };

  // Back to where the dialog was opened, saying what was done. `back` is the page under the dialog, built on the server.
  const back = text(form, "back");
  const base = back.startsWith("/admin?") || back === "/admin" ? back : "/admin";
  const done = kind === "role" ? roleDone(text(form, "from") as Role, role as Role) : kind;
  const sep = base.includes("?") ? "&" : "?";
  redirect(`${base}${sep}done=${done}${username && !base.includes("user=") ? `&who=${encodeURIComponent(username)}` : ""}` as never);
}

/** Only for the header's words: a grant from User, a revoke back to User, otherwise a change. */
function roleDone(from: Role, to: Role): string {
  if (from === "user") return "grant";
  if (to === "user") return "revoke";
  return "role";
}

/** The Grant role dialog's lookup: one account by @username or email (owner only, never a guest). */
export async function findAccount(query: string): Promise<(Person & { suspended: boolean }) | null> {
  const viewer = await requireStaff();
  if (!can(viewer.role, "roles.change")) return null;
  const j = await actingAs(viewer.id, async (db) => (await db.query("select staff_find_account($1) as out", [query.slice(0, 120)])).rows[0].out);
  if (!j) return null;
  return { id: j.id, name: j.name, username: j.username, avatarColour: j.avatarColour, role: j.role, suspended: j.suspended };
}
