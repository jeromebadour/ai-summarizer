import { FlaskConical, Info, LogIn, Scale, ShieldCheck } from "@/components/glyphs";
import Link from "@/components/NavLink";
import { Suspense, type ReactNode } from "react";
import { BrandMark } from "@/components/BrandMark";
import { SiteFooter } from "@/components/SiteFooter";
import { currentUser } from "@/lib/server/session";

export type DocPage = "about" | "privacy" | "terms";

const tabs = [
  { key: "about", href: "/about", label: "About", icon: Info },
  { key: "privacy", href: "/privacy", label: "Privacy", icon: ShieldCheck },
  { key: "terms", href: "/terms", label: "Terms", icon: Scale },
] as const;

/** Signed in: back to the app. Signed out: sign in. */
async function AccountButton() {
  const user = await currentUser();
  return user ? (
    <Link href="/" className="flex items-center gap-2 rounded-xl bg-brand px-3.5 py-2 text-[13px] font-semibold text-on-brand hover:brightness-110">
      <FlaskConical size={16} strokeWidth={2.2} />
      Open Distill
    </Link>
  ) : (
    <Link href="/login" className="flex items-center gap-2 rounded-xl border border-brand-line px-3.5 py-2 text-[13px] font-semibold text-text hover:bg-brand-soft">
      <LogIn size={16} strokeWidth={2} className="text-brand-strong" />
      Sign in
    </Link>
  );
}

/**
 * The frame of the About, Privacy and Terms pages: open to everyone, signed in or not. A slim header, the page with
 * its "On this page" list beside it, and the site footer. Unlike the app's screens, these are reading pages and scroll.
 */
export function DocShell({ page, aside, children }: { page: DocPage; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1120px] items-center gap-6 px-8 py-3 max-md:gap-2 max-md:px-3">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Distill">
            <BrandMark size={32} />
            <span className="text-[16px] font-semibold tracking-[-0.01em] max-md:hidden">Distill</span>
          </Link>
          <nav className="flex gap-1 rounded-xl border border-border bg-paper p-1">
            {tabs.map(({ key, href, label, icon: Icon }) => (
              <Link
                key={key}
                href={href}
                aria-current={page === key ? "page" : undefined}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold max-md:px-2 max-md:[&>svg]:hidden ${
                  page === key ? "bg-brand text-on-brand" : "text-muted hover:bg-panel-raised hover:text-text"
                }`}
              >
                <Icon size={15} strokeWidth={2} />
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto">
            <Suspense fallback={<span className="block h-9 w-32" />}>
              <AccountButton />
            </Suspense>
          </div>
        </div>
      </header>
      <main className={`mx-auto grid max-w-[1120px] gap-14 px-8 pb-20 pt-12 max-md:grid-cols-1 max-md:px-4 max-md:pb-12 max-md:pt-6 ${aside ? "grid-cols-[minmax(0,1fr)_240px]" : ""}`}>
        <article className="min-w-0">{children}</article>
        {aside && <div className="sticky top-24 self-start max-md:hidden">{aside}</div>}
      </main>
      <SiteFooter />
    </div>
  );
}
