"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { checkUsernameFormat, normalizeUsername } from "@/lib/username";
import { actAs, actingAs } from "@/lib/server/db";
import { checkPassword, hashPassword } from "@/lib/server/hash";
import { newPasswordRefusal, readAccountFields, takenRefusal, text, type FormState } from "@/lib/server/rules";
import { sendVerify } from "@/lib/server/email-tokens";
import { clearSessionCookie, openSession, thisSessionHash } from "@/lib/server/session";

export type AuthState = FormState;

const MAX_FAILURES = 10; // failed sign-ins on one account within 15 minutes

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const { fields, refusal } = readAccountFields(form);
  if (refusal) return refusal;
  const password = text(form, "password");
  const weak = newPasswordRefusal(password, fields.email);
  if (weak) return weak;

  const passwordHash = await hashPassword(password);
  const id = randomUUID();
  try {
    await actingAs(id, async (db) => {
      await db.query(
        "insert into users (id, name, username, email, password_hash, password_changed_at) values ($1, $2, $3, $4, $5, now())",
        [id, fields.name, fields.username, fields.email, passwordHash],
      );
      await db.query("insert into auth_events (user_id, kind) values ($1, 'signup')", [id]);
      await openSession(db, id);
      // The account starts unconfirmed (migration 012): the code goes out now, /verify waits for it.
      await sendVerify(db);
    });
  } catch (error) {
    const taken = takenRefusal(error);
    if (taken) return taken;
    throw error;
  }
  redirect("/verify");
}

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const identifier = normalizeUsername(text(form, "identifier"));
  const password = text(form, "password");
  const wrong: AuthState = { field: "identifier", error: "That email, username or password is wrong" };
  if (!identifier || !password || password.length > 200) {
    await checkPassword(null, password); // same time as a real check
    return wrong;
  }

  const outcome = await actingAs(null, async (db) => {
    const account = (await db.query("select id, password_hash, suspended from find_account($1)", [identifier])).rows[0];
    if (!account) {
      await checkPassword(null, password);
      return "wrong" as const;
    }
    const failures = (await db.query("select recent_failures($1) as n", [account.id])).rows[0].n as number;
    if (failures >= MAX_FAILURES) return "throttled" as const;
    if (!(await checkPassword(account.password_hash, password))) {
      await db.query("insert into auth_events (user_id, kind) values ($1, 'signin_failed')", [account.id]);
      return "wrong" as const;
    }
    // Only someone who knows the password learns the account is suspended.
    if (account.suspended) return "suspended" as const;
    await actAs(db, account.id);
    await db.query("insert into auth_events (user_id, kind) values ($1, 'signin')", [account.id]);
    await db.query("update users set last_active_at = now()");
    await openSession(db, account.id);
    return "ok" as const;
  });

  if (outcome === "wrong") return wrong;
  if (outcome === "throttled") {
    return { field: "identifier", error: "Too many tries on this account. Try again in 15 minutes" };
  }
  if (outcome === "suspended") return { field: "identifier", error: "This account is suspended" };
  redirect("/");
}

export async function startGuest(): Promise<void> {
  const started = await actingAs(null, async (db) => {
    // Null while guests are paused from the console: back to /login, which then shows the paused note.
    const id = (await db.query("select create_guest() as id")).rows[0].id as string | null;
    if (!id) return false;
    await actAs(db, id);
    await db.query("insert into auth_events (user_id, kind) values ($1, 'guest')", [id]);
    await openSession(db, id);
    return true;
  });
  redirect(started ? "/" : "/login");
}

export async function signOut(): Promise<void> {
  const hash = await thisSessionHash();
  if (hash) {
    await actingAs(null, async (db) => {
      const owner = (await db.query("select session_owner($1) as id", [hash])).rows[0]?.id as string | null;
      if (!owner) return;
      await actAs(db, owner);
      await db.query("delete from sessions where token_hash = $1", [hash]);
    });
  }
  await clearSessionCookie();
  redirect("/login");
}

/** Live answer for a username field. Format is checked first, so junk never reaches the database. */
export async function usernameFree(raw: string): Promise<boolean | null> {
  const name = normalizeUsername(raw);
  if (checkUsernameFormat(name).status !== "checking") return null;
  return actingAs(null, async (db) => !(await db.query("select username_taken($1) as t", [name])).rows[0].t);
}
