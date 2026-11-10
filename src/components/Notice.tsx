"use client";

import { CircleCheck, KeyRound, LogOut, MailCheck, MonitorX, UserCheck, UserX, X, type GlyphIcon } from "@/components/glyphs";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type NoticeLook = { icon: GlyphIcon; tone: "brand" | "verify"; title: string; detail?: string; stays?: boolean };

/**
 * What a finished step says once its redirect lands (`?done=<key>`). The one way an outcome after a redirect is told:
 * a card at the top of the page. Calm colours only: none of these is a problem. Keys not listed here are left alone.
 */
const notices: Record<string, NoticeLook> = {
  "signed-out": { icon: LogOut, tone: "brand", title: "You're signed out", detail: "This device is no longer signed in to Distill." },
  "account-deleted": {
    icon: UserX,
    tone: "brand",
    title: "Your account is deleted",
    detail: "Its summaries, devices and settings are gone for good. You can make a new account at any time.",
    stays: true,
  },
  "session-ended": {
    icon: LogOut,
    tone: "brand",
    title: "You were signed out",
    detail: "This session was ended from another device or by a password change. Sign in to carry on.",
    stays: true,
  },
  "password-changed": { icon: KeyRound, tone: "verify", title: "Password changed", detail: "Use the new one next time you sign in." },
  "password-changed-others": { icon: KeyRound, tone: "verify", title: "Password changed", detail: "Your other devices are signed out." },
  "password-set": { icon: KeyRound, tone: "verify", title: "New password set", detail: "You're signed in here, and every other device is signed out." },
  "profile-saved": { icon: UserCheck, tone: "verify", title: "Profile saved" },
  "device-signed-out": { icon: MonitorX, tone: "verify", title: "Device signed out", detail: "It has to sign in again to use your account." },
  "others-signed-out": { icon: MonitorX, tone: "verify", title: "Other devices signed out", detail: "Only this device is still signed in." },
  "email-confirmed": { icon: MailCheck, tone: "verify", title: "Email confirmed", detail: "Your account is ready." },
  "email-changed": { icon: MailCheck, tone: "verify", title: "Email changed", detail: "Distill now writes to the new address." },
  "email-change-cancelled": { icon: CircleCheck, tone: "verify", title: "Email change cancelled", detail: "Your account keeps its current email." },
};

const tones = {
  brand: { card: "border-brand-line", badge: "border-brand-line bg-brand-soft text-brand-strong" },
  verify: { card: "border-verify/35", badge: "border-verify/35 bg-verify-soft text-verify" },
};

export function Notice() {
  const params = useSearchParams();
  const key = params.get("done");
  const look = key ? notices[key] : undefined;
  const [closed, setClosed] = useState<string | null>(null);

  // The key leaves the address at once, so a reload or a shared link doesn't say it again.
  useEffect(() => {
    if (!look) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("done");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    if (look.stays) return;
    const timer = setTimeout(() => setClosed(key), 6000);
    return () => clearTimeout(timer);
  }, [key, look]);

  if (!look || closed === key) return null;
  const tone = tones[look.tone];
  const Icon = look.icon;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-5 z-[60] flex justify-center px-4">
      <div
        role="status"
        data-notice={key}
        className={`pointer-events-auto flex w-full max-w-[460px] animate-[notice-in_260ms_cubic-bezier(.2,.8,.2,1)] items-start gap-3.5 rounded-2xl border bg-panel px-4 py-3.5 shadow-[var(--shadow-dialog)] ${tone.card}`}
      >
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl border ${tone.badge}`}>
          <Icon size={18} strokeWidth={1.9} />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[14.5px] font-semibold">{look.title}</p>
          {look.detail && <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{look.detail}</p>}
        </div>
        <button type="button" aria-label="Close" onClick={() => setClosed(key)} className="rounded-lg p-1 text-muted hover:bg-panel-raised hover:text-text">
          <X size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
