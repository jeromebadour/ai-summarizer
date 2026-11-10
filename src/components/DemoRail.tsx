import { BrandMark } from "@/components/BrandMark";
import { ArrowLeft, LogIn, ShieldUser } from "@/components/glyphs";
import Link from "@/components/NavLink";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * Where the demo's way out leads. Someone with a session goes back to their own Distill; anyone else goes to sign in.
 * Only the cookie's presence is checked (no database here): a stale cookie lands on "/", which sends them to sign in.
 */
export function demoExit(signedIn: boolean) {
  return signedIn
    ? { href: "/", label: "Back to Distill", short: "Distill", Icon: ArrowLeft }
    : { href: "/login", label: "Sign in to Distill", short: "Sign in", Icon: LogIn };
}

/**
 * The public admin demo's rail: the console and the way out. Kept apart from the signed-in Rail so the demo never
 * loads sign-out or any other server action (and so no database code).
 */
export function DemoRail({ signedIn }: { signedIn: boolean }) {
  const item = "flex w-16 flex-col items-center gap-1.5 rounded-xl py-2.5 text-[11px] font-medium transition-colors";
  const exit = demoExit(signedIn);
  const bar = "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-medium transition-colors";
  return (
    <>
    {/* Phone: the same three things in a bar at the bottom. */}
    <nav aria-label="Places" className="fixed inset-x-0 bottom-0 z-40 flex gap-1 border-t border-border bg-panel/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur md:hidden">
      <Link href={exit.href} className={`${bar} text-muted`}>
        <exit.Icon size={21} strokeWidth={1.8} />
        {exit.short}
      </Link>
      <Link href="/demo/admin" aria-current="page" className={`${bar} bg-brand-soft text-brand-strong`}>
        <ShieldUser size={21} strokeWidth={1.8} />
        Admin
      </Link>
      <ThemeToggle className={`${bar} text-muted`} />
    </nav>
    <aside className="flex w-24 shrink-0 flex-col items-center border-r border-border bg-panel/60 py-5 max-md:hidden">
      <RailLogo href={exit.href} />
      <nav className="flex flex-col gap-2">
        <Link href={exit.href} className={`${item} text-muted hover:bg-panel-raised hover:text-text`}>
          <exit.Icon size={20} strokeWidth={1.75} />
          {exit.short}
        </Link>
        <Link href="/demo/admin" aria-current="page" className={`${item} bg-brand-soft text-brand-strong`}>
          <ShieldUser size={20} strokeWidth={1.75} />
          Admin
        </Link>
      </nav>
      <div className="mt-auto flex flex-col items-center gap-2">
        <ThemeToggle className={`${item} text-muted hover:bg-panel-raised hover:text-text`} />
      </div>
    </aside>
    </>
  );
}

export function RailLogo({ href }: { href?: string }) {
  const mark = <BrandMark size={44} glow />;
  return href ? (
    <Link href={href} aria-label="Distill" className="mb-8">
      {mark}
    </Link>
  ) : (
    <div className="mb-8" aria-label="Distill">
      {mark}
    </div>
  );
}
