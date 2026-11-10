import type { GlyphIcon } from "@/components/glyphs";
import Link from "@/components/NavLink";

export type PageTab = { key: string; label: string; icon: GlyphIcon; href: string };

/** The one tab row: filled indigo for the open tab. Used by the profile and the admin console. */
export function PageTabs({ tabs, current }: { tabs: PageTab[]; current: string }) {
  return (
    <nav className="group/tabs ml-2 flex gap-1 rounded-xl border border-border bg-paper p-1 max-md:order-last max-md:ml-0 max-md:w-full max-md:overflow-x-auto max-md:[scrollbar-width:none]">
      {tabs.map(({ key, label, icon: Icon, href }) => (
        <Link
          key={key}
          href={href}
          aria-current={key === current ? "page" : undefined}
          // The pressed tab takes the indigo at once and the open one lets go; the server's answer then confirms it.
          className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-[13px] font-semibold max-md:flex-1 max-md:shrink-0 max-md:justify-center max-md:px-3 ${
            key === current
              ? "bg-brand text-on-brand group-has-[[data-pending]]/tabs:bg-transparent group-has-[[data-pending]]/tabs:text-muted"
              : "text-muted hover:bg-panel-raised hover:text-text has-[[data-pending]]:bg-brand has-[[data-pending]]:text-on-brand"
          }`}
        >
          <Icon size={15} strokeWidth={2} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
