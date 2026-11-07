/**
 * Distill's account emails: confirm an email, set a new password. Written for email apps, not browsers: tables and
 * inline styles (Gmail and Outlook drop <style> rules and never run scripts), a PNG mark (no SVG), a plain-text twin
 * for apps that show text only. Each carries the code, a button that does the same job, the link written out, why
 * the email came and what to do if it wasn't you, and a footer.
 *
 * Email apps block scripts, so a copy button can't work inside an email; the code box is set to select the whole code
 * with one tap or double-click instead, and the button means nobody has to copy anything.
 */

export type AccountEmailKind = "verify" | "reset";

export type AccountEmail = { subject: string; html: string; text: string };

const SITE = "https://distill.jeromebadour.com";
const CONTACT = "privacy@jeromebadour.com";

// The app's own colours, written out (email apps don't read CSS variables).
const c = {
  page: "#f6f6f2",
  card: "#ffffff",
  line: "#e3e3dc",
  text: "#1d2128",
  muted: "#50565f",
  faint: "#767c85",
  brand: "#4f629c",
  brandSoft: "#eef0f7",
  brandLine: "#c9d0e6",
};

const words = {
  verify: {
    subject: (code: string) => `${code} is your Distill code`,
    preheader: "Confirm your email to start using Distill.",
    title: "Confirm your email",
    lead: (name: string) => `Hi ${name}, here is your code to confirm this email for your Distill account.`,
    button: "Confirm my email",
    expires: "The code and the button work once, for 24 hours.",
    notYou: "If you didn't create a Distill account, ignore this email: nothing happens without it.",
  },
  reset: {
    subject: (code: string) => `${code} is your code to reset your Distill password`,
    preheader: "Set a new password for your Distill account.",
    title: "Set a new password",
    lead: (name: string) => `Hi ${name}, someone asked to set a new password for your Distill account. If it was you, use this code or the button.`,
    button: "Set a new password",
    expires: "The code and the button work once, for 30 minutes. Setting a new password signs out every other device.",
    notYou: "If it wasn't you, ignore this email: your password stays as it is.",
  },
} as const;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** `code` is 6 digits; `url` carries the one-time token (the button and the written-out link). */
export function accountEmail(kind: AccountEmailKind, { name, code, url }: { name: string; code: string; url: string }): AccountEmail {
  const w = words[kind];
  const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const mono = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";
  const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(w.title)}</title>
</head>
<body style="margin:0;padding:0;background:${c.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(w.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${c.page};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">

<tr><td style="padding:0 4px 20px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="vertical-align:middle;"><img src="${SITE}/email/mark.png" width="36" height="36" alt="" style="display:block;border:0;border-radius:10px;"></td>
    <td style="vertical-align:middle;padding-left:10px;font:600 18px ${font};color:${c.text};letter-spacing:-0.01em;">Distill</td>
  </tr></table>
</td></tr>

<tr><td style="background:${c.card};border:1px solid ${c.line};border-radius:16px;padding:32px 32px 28px;">
  <h1 style="margin:0;font:600 22px/1.3 ${font};color:${c.text};letter-spacing:-0.01em;">${esc(w.title)}</h1>
  <p style="margin:10px 0 0;font:400 15px/1.6 ${font};color:${c.muted};">${esc(w.lead(name))}</p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
    <tr><td align="center" style="background:${c.brandSoft};border:1px solid ${c.brandLine};border-radius:12px;padding:18px 12px 14px;">
      <div style="font:600 11px ${font};color:${c.brand};letter-spacing:0.12em;text-transform:uppercase;">Your code</div>
      <div style="margin-top:6px;font:700 34px ${mono};color:${c.text};letter-spacing:0.18em;-webkit-user-select:all;user-select:all;">${spaced}</div>
      <div style="margin-top:6px;font:400 12px ${font};color:${c.faint};">Tap or double-click to select it</div>
    </td></tr>
  </table>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
    <tr><td align="center" style="border-radius:12px;background:${c.brand};">
      <a href="${esc(url)}" style="display:block;padding:14px 20px;font:600 15px ${font};color:#ffffff;text-decoration:none;border-radius:12px;">${esc(w.button)}</a>
    </td></tr>
  </table>

  <p style="margin:20px 0 0;font:400 13px/1.6 ${font};color:${c.muted};">${esc(w.expires)}</p>
  <p style="margin:8px 0 0;font:400 13px/1.6 ${font};color:${c.muted};">${esc(w.notYou)}</p>

  <p style="margin:20px 0 0;padding-top:16px;border-top:1px solid ${c.line};font:400 12px/1.6 ${font};color:${c.faint};">
    Button not working? Open this link:<br>
    <a href="${esc(url)}" style="color:${c.brand};word-break:break-all;">${esc(url)}</a>
  </p>
</td></tr>

<tr><td style="padding:22px 4px 0;font:400 12px/1.7 ${font};color:${c.faint};">
  <a href="${SITE}/about" style="color:${c.brand};text-decoration:none;">About</a> &nbsp;·&nbsp;
  <a href="${SITE}/privacy" style="color:${c.brand};text-decoration:none;">Privacy</a> &nbsp;·&nbsp;
  <a href="${SITE}/terms" style="color:${c.brand};text-decoration:none;">Terms</a> &nbsp;·&nbsp;
  <a href="mailto:${CONTACT}" style="color:${c.brand};text-decoration:none;">${CONTACT}</a><br>
  Distill: summaries you can check. Built by Jerome Badour.<br>
  You got this email because this address was entered on distill.jeromebadour.com. It's an account email, so there's nothing to unsubscribe from.
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    "Distill",
    "",
    w.title,
    "",
    w.lead(name),
    "",
    `Your code: ${spaced}`,
    "",
    `${w.button}: ${url}`,
    "",
    w.expires,
    w.notYou,
    "",
    "--",
    "Distill: summaries you can check. Built by Jerome Badour.",
    `About ${SITE}/about · Privacy ${SITE}/privacy · Terms ${SITE}/terms · ${CONTACT}`,
  ].join("\n");

  return { subject: w.subject(code), html, text };
}
