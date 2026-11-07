import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import { accountEmail, type AccountEmailKind } from "@/lib/email/account-email";
import type { Db } from "./db";
import { sendMail, siteUrl } from "./mailer";
import { hashToken } from "./session";

/**
 * One-time codes and links for the account emails (migration 012). The database stores only their SHA-256; the code
 * and the link go out in the email and nowhere else.
 */
export type OneTime = { code: string; link: string; codeHash: Buffer; linkHash: Buffer };

export function newOneTime(): OneTime {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const link = randomBytes(32).toString("base64url");
  return { code, link, codeHash: hashToken(code), linkHash: hashToken(link) };
}

/** A fresh link token alone (a reset code swapped for the page that sets the password). */
export function newLink(): { link: string; linkHash: Buffer } {
  const link = randomBytes(32).toString("base64url");
  return { link, linkHash: hashToken(link) };
}

/** Only digits, exactly six: anything else is never sent to the database. */
export function readCode(raw: string): string | null {
  const code = raw.replace(/\D/g, "");
  return code.length === 6 ? code : null;
}

export async function sendAccountEmail(kind: AccountEmailKind, to: { email: string; name: string }, t: OneTime): Promise<boolean> {
  const base = await siteUrl();
  const url = kind === "verify" ? `${base}/verify/confirm?token=${t.link}` : `${base}/reset?token=${t.link}`;
  const mail = accountEmail(kind, { name: to.name, code: t.code, url });
  return sendMail({ to: to.email, ...mail });
}

/**
 * Sends the signed-in account a code to confirm its email (or its pending new one). Runs inside the caller's
 * transaction, acting as that account. "none" when there's nothing to confirm; "busy" after five in an hour.
 */
export async function sendVerify(db: Db): Promise<"sent" | "failed" | "none" | "busy"> {
  const t = newOneTime();
  let to: { email: string; name: string } | null;
  try {
    to = (await db.query("select issue_verify($1, $2) as out", [t.codeHash, t.linkHash])).rows[0].out;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("email: too many")) return "busy";
    throw error;
  }
  if (!to) return "none";
  return (await sendAccountEmail("verify", to, t)) ? "sent" : "failed";
}
