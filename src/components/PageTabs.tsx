import type { LucideIcon } from "lucide-react";
import Link from "next/link";

export type PageTab = { key: string; label: string; icon: LucideIcon; href: string };

/** The one tab row: filled indigo for the open tab. Used by the profile and the admin console. */
export function PageTabs({ tabs, current }: { tabs: PageTab[]; current: string }) {
  return (
    <nav className="ml-2 flex gap-1 rounded-xl border border-border bg-paper p-1">
      {tabs.map(({ key, label, icon: Icon, href }) => (
        <Link
          key={key}
          href={href}
          aria-current={key === current ? "page" : undefined}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
            key === current ? "bg-brand text-on-brand" : "text-muted hover:bg-panel-raised hover:text-text"
          }`}
        >
          <Icon size={15} strokeWidth={2} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
