"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { avatarColours } from "@/lib/profile";
import { sendVerify } from "@/lib/server/email-tokens";
import { actingAs } from "@/lib/server/db";
import { checkPassword, hashPassword } from "@/lib/server/hash";
import { newPasswordRefusal, readAccountFields, takenRefusal, text, type FormState } from "@/lib/server/rules";
import { clearSessionCookie, currentUser, thisSessionHash } from "@/lib/server/session";

/**
 * Account actions. Each one re-reads the session itself (never trusts the page), runs as the user under row-level
 * security, and changes only that user's own rows.
 */

async function signedIn() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

/** Signs out one other device by its public session id. This device signs out with the rail's Sign out. */
export async function signOutDevice(form: FormData): Promise<void> {
  const user = await signedIn();
  const id = Number(text(form, "session"));
  const here = await thisSessionHash();
  if (Number.isSafeInteger(id) && here) {
    await actingAs(user.id, (db) => db.query("delete from sessions where id = $1 and token_hash <> $2", [id, here]));
  }
  refresh();
}

export async function signOutOthers(): Promise<void> {
  const user = await signedIn();
  const here = await thisSessionHash();
  if (here) await actingAs(user.id, (db) => db.query("delete from sessions where token_hash <> $1", [here]));
  refresh();
}

export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const user = await signedIn();
  if (user.isGuest || !user.email) return { error: "Guests have no password" };
  const current = text(form, "current");
  const next = text(form, "next");
  if (next === current) return { field: "next", error: "The new password is the same as the current one" };
  const weak = newPasswordRefusal(next, user.email);
  if (weak) return { ...weak, field: "next" };

  const here = await thisSessionHash();
  const ok = await actingAs(user.id, async (db) => {
    const stored = (await db.query("select password_hash from users")).rows[0]?.password_hash as string | null;
    if (!(await checkPassword(stored, current))) return false;
    await db.query("update users set password_hash = $1, password_changed_at = now()", [await hashPassword(next)]);
    if (text(form, "signOutOthers") === "on" && here) {
      await db.query("delete from sessions where token_hash <> $1", [here]);
    }
    return true;
  });
  if (!ok) return { field: "current", error: "The current password is wrong" };
  redirect("/profile?tab=security");
}

export async function updateProfile(_: FormState, form: FormData): Promise<FormState> {
  const user = await signedIn();
  if (user.isGuest || !user.email) return { error: "Create an account to edit a profile" };
  const { fields, refusal } = readAccountFields(form);
  if (refusal) return refusal;
  const colour = text(form, "avatarColour") || user.avatarColour;
  if (!(avatarColours as readonly string[]).includes(colour)) return { error: "Unknown avatar colour" };
  const emailChanges = fields.email !== user.email;
  const sensitive = fields.username !== user.username || emailChanges;

  try {
    const ok = await actingAs(user.id, async (db) => {
      // Changing how you sign in (username or email) asks for the password, so an open laptop can't take the account.
      if (sensitive) {
        const stored = (await db.query("select password_hash from users")).rows[0]?.password_hash as string | null;
        if (!(await checkPassword(stored, text(form, "password")))) return false;
      }
      // A new email waits until its code or link confirms it (migration 012); the account keeps the current one.
      if (emailChanges && (await db.query("select 1 from find_account($1)", [fields.email])).rowCount) return "taken";
      await db.query("update users set name = $1, username = $2, pending_email = $3, avatar_colour = $4", [
        fields.name,
        fields.username,
        emailChanges ? fields.email : null,
        colour,
      ]);
      if (emailChanges) await sendVerify(db);
      return true;
    });
    if (ok === "taken") return { field: "email", error: "This email is used by another account" };
    if (!ok) return { field: "password", error: "The password is wrong" };
    if (emailChanges) redirect("/verify");
  } catch (error) {
    const taken = takenRefusal(error);
    if (taken) return taken.code ? { field: "email", error: "This email is used by another account" } : taken;
    throw error;
  }
  redirect("/profile");
}

/** A guest becomes a real account in place: same user, so every summary and use stays attached. */
export async function upgradeGuest(_: FormState, form: FormData): Promise<FormState> {
  const user = await signedIn();
  if (!user.isGuest) redirect("/profile");
  const { fields, refusal } = readAccountFields(form);
  if (refusal) return refusal;
  const password = text(form, "password");
  const weak = newPasswordRefusal(password, fields.email);
  if (weak) return weak;

  const passwordHash = await hashPassword(password);
  try {
    await actingAs(user.id, async (db) => {
      const done = (
        await db.query("select upgrade_guest($1, $2, $3, $4) as ok", [fields.name, fields.username, fields.email, passwordHash])
      ).rows[0].ok as boolean;
      if (!done) throw new Error("upgrade_guest refused");
      await db.query("insert into auth_events (user_id, kind) values ($1, 'upgrade')", [user.id]);
      await sendVerify(db);
    });
  } catch (error) {
    const taken = takenRefusal(error);
    if (taken) return taken;
    throw error;
  }
  redirect("/verify");
}

export async function deleteAccount(_: FormState, form: FormData): Promise<FormState> {
  const user = await signedIn();
  if (user.role === "owner") return { error: "The owner account can't be deleted" };
  if (text(form, "confirm").trim().toLowerCase() !== user.username) {
    return { field: "confirm", error: `Type ${user.username} to confirm` };
  }
  await actingAs(user.id, async (db) => {
    // The event outlives the account (its user_id becomes null), so it keeps the username as its only detail.
    await db.query("insert into auth_events (user_id, kind, detail) values ($1, 'delete', $2)", [user.id, `@${user.username}`]);
    // Sessions and summaries go with the user; the spend ledger stays (migration 002).
    await db.query("delete from users");
  });
  await clearSessionCookie();
  redirect("/login");
}

const preferenceValues = {
  theme: ["system", "light", "dark"],
  motion: ["system", "full", "reduced"],
  links: ["always", "hover"],
  default_length: ["short", "medium", "bullets"],
  avatar_colour: avatarColours as readonly string[],
} as const;
export type PreferenceField = keyof typeof preferenceValues;

/**
 * One preference, saved as it is picked (no Save button). The field and value are checked against fixed lists, so
 * nothing but these columns, with their known values, can ever be written this way.
 */
export async function savePreference(field: PreferenceField, value: string): Promise<{ ok: boolean }> {
  const user = await currentUser();
  if (!user) return { ok: false };
  const allowed = preferenceValues[field] as readonly string[] | undefined;
  if (!allowed || !allowed.includes(value)) return { ok: false };
  // Guests have no avatar (they show the guest glyph).
  if (field === "avatar_colour" && user.isGuest) return { ok: false };
  await actingAs(user.id, (db) => db.query(`update users set ${field} = $1`, [value]));
  refresh();
  return { ok: true };
}
