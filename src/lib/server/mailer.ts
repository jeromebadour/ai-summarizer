import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { headers } from "next/headers";

/**
 * Sends one email through Resend's HTTP API (RESEND_API_KEY, from the server's env file). In tests there is no key:
 * EMAIL_OUTBOX names a folder and each email is written there as JSON, so the browser suites can read the code and
 * the link. With neither, nothing is sent and the failure is logged (the screens still answer the same).
 */
export type Mail = { to: string; subject: string; html: string; text: string };

const FROM = process.env.EMAIL_FROM ?? "Distill <noreply@jeromebadour.com>";

export async function sendMail(mail: Mail): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (key) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM, to: [mail.to], subject: mail.subject, html: mail.html, text: mail.text }),
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) return true;
      console.error(`mailer: Resend answered ${res.status}: ${(await res.text()).slice(0, 300)}`);
    } catch (error) {
      console.error("mailer: Resend could not be reached", error);
    }
    return false;
  }
  const outbox = process.env.EMAIL_OUTBOX;
  if (outbox) {
    await mkdir(outbox, { recursive: true });
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
    await writeFile(path.join(outbox, name), JSON.stringify({ from: FROM, ...mail }));
    return true;
  }
  console.error("mailer: no RESEND_API_KEY and no EMAIL_OUTBOX: an account email was not sent");
  return false;
}

/** The address links in emails point to: APP_URL when set, otherwise the address this request came in on. */
export async function siteUrl(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
