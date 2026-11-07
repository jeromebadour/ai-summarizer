import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { describeDevice } from "@/lib/device";
import { actAs, actingAs, type Db } from "./db";
import { SESSION_COOKIE } from "./session-cookie";

/**
 * Sessions: the browser holds a random 32-byte token in an httpOnly cookie; the database holds only its SHA-256, so a
 * leaked database can't sign anyone in. A session lives 30 days from its last use (extended by `session_owner`).
 */
const secure = process.env.NODE_ENV === "production";
export { SESSION_COOKIE };
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export function hashToken(token: string): Buffer {
  return createHash("sha256").update(token).digest();
}

export type CurrentUser = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  avatarColour: string;
  role: "owner" | "admin" | "moderator" | "user" | "guest";
  isGuest: boolean;
  suspended: boolean;
  defaultLength: "short" | "medium" | "bullets";
  theme: "system" | "light" | "dark";
  motion: "system" | "full" | "reduced";
  links: "always" | "hover";
  createdAt: Date;
  /** Guests have no email to confirm, so they count as confirmed. */
  emailVerified: boolean;
  /** A new email waiting for its code or link (the account keeps its current one until then). */
  pendingEmail: string | null;
};

const userColumns = `id, name, username, email, avatar_colour, role, suspended_at is not null as suspended,
  default_length, theme, motion, links, created_at, (role = 'guest' or email_verified_at is not null) as email_verified, pending_email`;

function toUser(row: Record<string, unknown>): CurrentUser {
  return {
    id: row.id as string,
    name: row.name as string,
    username: row.username as string,
    email: (row.email as string | null) ?? null,
    avatarColour: row.avatar_colour as string,
    role: row.role as CurrentUser["role"],
    isGuest: row.role === "guest",
    suspended: row.suspended as boolean,
    defaultLength: row.default_length as CurrentUser["defaultLength"],
    theme: row.theme as CurrentUser["theme"],
    motion: row.motion as CurrentUser["motion"],
    links: row.links as CurrentUser["links"],
    createdAt: row.created_at as Date,
    emailVerified: row.email_verified as boolean,
    pendingEmail: (row.pending_email as string | null) ?? null,
  };
}

/** The signed-in user for this request, or null. Read once per request (React `cache`). */
export const currentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return actingAs(null, async (db) => {
    const owner = (await db.query("select session_owner($1) as id", [hashToken(token)])).rows[0]?.id as string | null;
    if (!owner) return null;
    await actAs(db, owner);
    const row = (await db.query(`select ${userColumns} from users`)).rows[0];
    return row ? toUser(row) : null;
  });
});

/** Opens a session for `userId` inside the caller's transaction (already acting as that user) and sets the cookie. */
export async function openSession(db: Db, userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const { browser, os } = describeDevice((await headers()).get("user-agent") ?? "");
  await db.query("insert into sessions (token_hash, user_id, browser, os) values ($1, $2, $3, $4)", [
    hashToken(token),
    userId,
    browser,
    os,
  ]);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
}

/** The hash of this browser's session token, to tell "this device" apart in the device list. */
export async function thisSessionHash(): Promise<Buffer | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? hashToken(token) : null;
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
