import { DoorOpen, FlaskConical, Library, LogOut, ShieldUser, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { isStaff } from "@/lib/permissions";
import type { Account } from "@/lib/profile";
import { sampleAccount } from "@/lib/sample";

function Logo() {
  return (
    <div className="mb-8 grid size-11 place-items-center rounded-xl bg-brand shadow-[0_0_24px_var(--glow)]" aria-label="Distill">
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
        <rect x="2" y="3" width="18" height="3.2" rx="1.6" fill="var(--on-brand)" />
        <rect x="5" y="9.4" width="12" height="3.2" rx="1.6" fill="var(--on-brand)" />
        <rect x="8" y="15.8" width="6" height="3.2" rx="1.6" fill="var(--on-brand)" />
      </svg>
    </div>
  );
}

export type RailPage = "distill" | "saved" | "profile" | "admin";

type RailItemProps = {
  icon: LucideIcon;
  label: string;
  href?: string;
  active?: boolean;
};

function RailItem({ icon: Icon, label, href, active = false }: RailItemProps) {
  const className = `flex w-16 flex-col items-center gap-1.5 rounded-xl py-2.5 text-[11px] font-medium transition-colors ${
        active ? "bg-brand-soft text-brand-strong" : "text-muted hover:bg-panel-raised hover:text-text"
      }`;
  const content = (
    <>
      <Icon size={20} strokeWidth={1.75} />
      {label}
    </>
  );
  return href ? (
    <Link href={href} aria-current={active ? "page" : undefined} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" className={className}>
      {content}
    </button>
  );
}

/** `demo`: the public admin demo. Nobody is signed in, so only the console and a way back out are shown. */
export function Rail({ page, account = sampleAccount, demo = false }: { page: RailPage; account?: Account; demo?: boolean }) {
  if (demo) {
    return (
      <aside className="flex w-24 shrink-0 flex-col items-center border-r border-border bg-panel/60 py-5">
        <Logo />
        <nav className="flex flex-col gap-2">
          <RailItem icon={ShieldUser} label="Admin" href="/demo/admin" active />
        </nav>
        <div className="mt-auto flex flex-col items-center gap-2">
          <ThemeToggle className="flex w-16 flex-col items-center gap-1.5 rounded-xl py-2.5 text-[11px] font-medium text-muted transition-colors hover:bg-panel-raised hover:text-text" />
          <RailItem icon={DoorOpen} label="Exit demo" href="/login" />
        </div>
      </aside>
    );
  }
  return (
    <aside className="flex w-24 shrink-0 flex-col items-center border-r border-border bg-panel/60 py-5">
      <Logo />
      <nav className="flex flex-col gap-2">
        <RailItem icon={FlaskConical} label="Distill" href="/" active={page === "distill"} />
        <RailItem icon={Library} label="Saved" href="/saved" active={page === "saved"} />
        {isStaff(account.role) && <RailItem icon={ShieldUser} label="Admin" href="/admin" active={page === "admin"} />}
      </nav>
      <div className="mt-auto flex flex-col items-center gap-2">
        <ThemeToggle className="flex w-16 flex-col items-center gap-1.5 rounded-xl py-2.5 text-[11px] font-medium text-muted transition-colors hover:bg-panel-raised hover:text-text" />
        <RailItem icon={LogOut} label="Sign out" />
        <Link
          href="/profile"
          aria-label="Profile"
          aria-current={page === "profile" ? "page" : undefined}
          className={`mt-2 rounded-full p-0.5 ${page === "profile" ? "ring-2 ring-brand-strong" : "hover:ring-2 hover:ring-border-strong"}`}
        >
          {account.isGuest ? (
            <span className="grid size-9 place-items-center rounded-full border border-input/40 bg-input-soft text-input">
              <UserRound size={18} strokeWidth={1.9} />
            </span>
          ) : (
            <Avatar name={account.name} colour={account.avatarColour} size={36} />
          )}
        </Link>
      </div>
    </aside>
  );
}
