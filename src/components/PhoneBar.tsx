"use client";

import { Ellipsis, FlaskConical, Info, Library, ShieldUser, UserRound, X, type GlyphIcon } from "@/components/glyphs";
import { useEffect, useState, type ReactNode } from "react";
import Link from "@/components/NavLink";
import { Avatar } from "@/components/Avatar";
import { SignOutButton } from "@/components/SignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { savePreference } from "@/app/actions/account";
import type { RailPage } from "@/components/Rail";
import type { Account } from "@/lib/profile";

const item =
  "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-medium transition-colors";
const idle = "text-muted has-[[data-pending]]:bg-brand-soft has-[[data-pending]]:text-brand-strong";
const on = "bg-brand-soft text-brand-strong group-has-[[data-pending]]/bar:bg-transparent group-has-[[data-pending]]/bar:text-muted";

function BarLink({ href, icon: Icon, label, active, children, tour }: { href: string; icon?: GlyphIcon; label: string; active: boolean; children?: ReactNode; tour?: string }) {
  return (
    <Link href={href} data-tour={tour} aria-current={active ? "page" : undefined} className={`${item} ${active ? on : idle}`}>
      {children ?? (Icon && <Icon size={21} strokeWidth={1.8} />)}
      {label}
    </Link>
  );
}

/**
 * Phone only (under 768px): the rail becomes a bar at the bottom, within thumb reach. The same places as the rail;
 * the quiet controls (About, theme, Sign out) sit behind More, in a sheet.
 */
export function PhoneBar({ page, account, staff }: { page: RailPage; account: Account; staff: boolean }) {
  const [more, setMore] = useState(false);

  useEffect(() => {
    if (!more) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMore(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [more]);

  const sheetRow = "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[14.5px] font-medium text-text hover:bg-panel-raised";
  return (
    <>
      <nav
        aria-label="Places"
        className="group/bar fixed inset-x-0 bottom-0 z-40 flex gap-1 border-t border-border bg-panel/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur md:hidden"
      >
        <BarLink href="/" icon={FlaskConical} label="Distill" active={page === "distill"} />
        <BarLink href="/saved" icon={Library} label="Saved" active={page === "saved"} tour="saved" />
        {staff && <BarLink href="/admin" icon={ShieldUser} label="Admin" active={page === "admin"} />}
        <BarLink href="/profile" label="Profile" active={page === "profile"} tour="profile">
          {account.isGuest ? (
            <span className="grid size-[22px] place-items-center rounded-full border border-input/40 bg-input-soft text-input">
              <UserRound size={13} strokeWidth={2} />
            </span>
          ) : (
            <Avatar name={account.name} colour={account.avatarColour} size={22} />
          )}
        </BarLink>
        <button type="button" data-tour="more" onClick={() => setMore(true)} aria-expanded={more} className={`${item} ${idle}`}>
          <Ellipsis size={21} strokeWidth={1.8} />
          More
        </button>
      </nav>
      {more && (
        <div className="fixed inset-0 z-50 flex items-end bg-[var(--overlay)] backdrop-blur-[3px] md:hidden" onClick={() => setMore(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More"
            onClick={(event) => event.stopPropagation()}
            className="w-full animate-[sheet-in_220ms_cubic-bezier(.2,.8,.2,1)] rounded-t-2xl border-t border-border bg-panel px-3 pb-[max(14px,env(safe-area-inset-bottom))] pt-2 shadow-[var(--shadow-dialog)]"
          >
            <div className="mb-1 flex items-center px-3 pt-1">
              <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">More</span>
              <button type="button" aria-label="Close" onClick={() => setMore(false)} className="ml-auto rounded-lg p-1.5 text-muted hover:text-text">
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <Link href="/about" onClick={() => setMore(false)} className={sheetRow}>
              <Info size={20} strokeWidth={1.8} className="text-brand-strong" />
              About Distill
            </Link>
            <ThemeToggle save={savePreference} row className={sheetRow} />
            <SignOutButton guest={account.isGuest} className={`${sheetRow} text-clear`} />
          </div>
        </div>
      )}
    </>
  );
}
