import { FlaskConical, Info, Library, LogOut, ShieldUser, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { savePreference } from "@/app/actions/account";
import { signOut } from "@/app/actions/auth";
import { AppearanceSync } from "@/components/AppearanceSync";
import { Avatar } from "@/components/Avatar";
import { RailLogo } from "@/components/DemoRail";
import { PendingButton } from "@/components/PendingButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { isStaff } from "@/lib/permissions";
import type { Account } from "@/lib/profile";

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

export function Rail({ page, account }: { page: RailPage; account: Account }) {
  return (
    <aside className="flex w-24 shrink-0 flex-col items-center border-r border-border bg-panel/60 py-5">
      <RailLogo />
      <AppearanceSync theme={account.theme ?? "system"} motion={account.motion ?? "system"} />
      <nav className="flex flex-col gap-2">
        <RailItem icon={FlaskConical} label="Distill" href="/" active={page === "distill"} />
        <RailItem icon={Library} label="Saved" href="/saved" active={page === "saved"} />
        {isStaff(account.role) && <RailItem icon={ShieldUser} label="Admin" href="/admin" active={page === "admin"} />}
      </nav>
      <div className="mt-auto flex flex-col items-center gap-2">
        {/* About, Privacy and Terms: reading pages, so they sit with the quiet controls, not the main three. */}
        <RailItem icon={Info} label="About" href="/about" />
        <ThemeToggle save={savePreference} className="flex w-16 flex-col items-center gap-1.5 rounded-xl py-2.5 text-[11px] font-medium text-muted transition-colors hover:bg-panel-raised hover:text-text" />
        <form action={signOut}>
          <PendingButton
            icon={<LogOut size={20} strokeWidth={1.75} />}
            iconSize={20}
            strokeWidth={1.75}
            label="Sign out"
            pendingLabel="Leaving"
            className="flex w-16 flex-col items-center gap-1.5 rounded-xl py-2.5 text-[11px] font-medium text-muted transition-colors hover:bg-panel-raised hover:text-text"
          />
        </form>
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
