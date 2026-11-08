"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { actAs, actingAs } from "@/lib/server/db";
import { newLink, newOneTime, readCode, sendAccountEmail, sendVerify } from "@/lib/server/email-tokens";
import { hashPassword } from "@/lib/server/hash";
import { newPasswordRefusal, text, type FormState } from "@/lib/server/rules";
import { RESET_EMAIL } from "@/lib/server/reset-cookie";
import { currentUser, hashToken, openSession } from "@/lib/server/session";

/**
 * Confirming an email and setting a new password (migration 012). Codes and links are checked in the database, which
 * stores only their hashes, counts wrong tries and ends each after one use.
 */

const secure = process.env.NODE_ENV === "production";

/** The code typed on /verify. */
export async function verifyCode(_: FormState, form: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) redirect("/login");
  const code = readCode(text(form, "code"));
  if (!code) return { field: "code", error: "Type all six digits of the code" };
  const result = await actingAs(user.id, async (db) => (await db.query("select verify_by_code($1) as r", [hashToken(code)])).rows[0].r as string);
  if (result === "wrong") return { field: "code", error: "That code doesn't match. Check the newest email, or send a new code." };
  if (result === "expired") return { field: "code", error: "That code has run out. Send a new one." };
  if (result === "taken") return { field: "code", error: "That email now belongs to another account." };
  redirect(user.pendingEmail ? "/profile?done=email-changed" : "/?done=email-confirmed");
}

/** "Send a new code" on /verify, and the button on an expired link while signed in. */
export async function resendVerify(): Promise<FormState> {
  const user = await currentUser();
  if (!user) redirect("/login");
  const result = await actingAs(user.id, (db) => sendVerify(db));
  if (result === "none") redirect("/");
  if (result === "busy") return { error: "That's five codes this hour. Use the newest one, or try again later." };
  if (result === "failed") return { error: "The email couldn't be sent just now. Try again in a minute." };
  return { code: "nothing" }; // sent: the screen restarts its countdown
}

/** The link from the email (posted by /verify/confirm, never by simply opening it): confirms, then signs in here. */
export async function verifyLink(form: FormData): Promise<void> {
  const token = text(form, "token");
  const userId = token
    ? await actingAs(null, async (db) => {
        const id = (await db.query("select verify_by_link($1) as id", [hashToken(token)])).rows[0].id as string | null;
        if (!id) return null;
        // Already signed in as this account here: keep that session. Otherwise this browser signs in.
        const here = await currentUser();
        if (here?.id !== id) {
          await actAs(db, id);
          await openSession(db, id);
        }
        return id;
      })
    : null;
  redirect(userId ? "/?done=email-confirmed" : "/verify/confirm?state=expired");
}

/** Leaves a pending email change: the account keeps its current email. */
export async function cancelEmailChange(): Promise<void> {
  const user = await currentUser();
  if (!user) redirect("/login");
  await actingAs(user.id, (db) => db.query("update users set pending_email = null"));
  redirect("/profile?done=email-change-cancelled");
}

/** Forgot password. The answer is the same whether or not the email has an account. */
export async function sendReset(_: FormState, form: FormData): Promise<FormState> {
  const email = text(form, "email").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return { field: "email", error: "Enter the email on your account" };
  const t = newOneTime();
  const to = await actingAs(null, async (db) => (await db.query("select issue_reset($1, $2, $3) as out", [email, t.codeHash, t.linkHash])).rows[0].out);
  // Sent without waiting for it, so a known email doesn't answer more slowly than an unknown one.
  if (to) void sendAccountEmail("reset", to, t);
  (await cookies()).set(RESET_EMAIL, email, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 30 * 60 });
  redirect("/forgot?sent=1");
}

/** The reset code: swapped for a one-time link to Set a new password. */
export async function checkResetCode(_: FormState, form: FormData): Promise<FormState> {
  const email = (await cookies()).get(RESET_EMAIL)?.value;
  if (!email) redirect("/forgot");
  const code = readCode(text(form, "code"));
  if (!code) return { field: "code", error: "Type all six digits of the code" };
  const fresh = newLink();
  const result = await actingAs(null, async (db) =>
    (await db.query("select reset_code_to_link($1, $2, $3) as r", [email, hashToken(code), fresh.linkHash])).rows[0].r as string,
  );
  if (result === "wrong") return { field: "code", error: "That code doesn't match. Check the newest email." };
  if (result === "expired") return { field: "code", error: "That code has run out. Ask for a new one." };
  redirect(`/reset?token=${fresh.link}`);
}

/** Set a new password: every session of the account ends, and this browser signs in. */
export async function saveNewPassword(_: FormState, form: FormData): Promise<FormState> {
  const token = text(form, "token");
  const password = text(form, "password");
  const linkHash = hashToken(token);
  const email = await actingAs(null, async (db) => (await db.query("select reset_link_email($1) as e", [linkHash])).rows[0].e as string | null);
  if (!email) redirect("/reset?state=expired");
  const weak = newPasswordRefusal(password, email);
  if (weak) return weak;
  const passwordHash = await hashPassword(password);
  const userId = await actingAs(null, async (db) => {
    const id = (await db.query("select reset_by_link($1, $2) as id", [linkHash, passwordHash])).rows[0].id as string | null;
    if (!id) return null;
    await actAs(db, id);
    await openSession(db, id);
    return id;
  });
  if (!userId) redirect("/reset?state=expired");
  (await cookies()).delete(RESET_EMAIL);
  redirect("/?done=password-set");
}
