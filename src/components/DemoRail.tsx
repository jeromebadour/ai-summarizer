import { BrandMark } from "@/components/BrandMark";
import { DoorOpen, ShieldUser } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * The public admin demo's rail. Nobody is signed in, so only the console and a way back out are shown. Kept apart
 * from the signed-in Rail so the demo never loads sign-out or any other server action (and so no database code).
 */
export function DemoRail() {
  const item = "flex w-16 flex-col items-center gap-1.5 rounded-xl py-2.5 text-[11px] font-medium transition-colors";
  return (
    <aside className="flex w-24 shrink-0 flex-col items-center border-r border-border bg-panel/60 py-5">
      <RailLogo />
      <nav className="flex flex-col gap-2">
        <Link href="/demo/admin" aria-current="page" className={`${item} bg-brand-soft text-brand-strong`}>
          <ShieldUser size={20} strokeWidth={1.75} />
          Admin
        </Link>
      </nav>
      <div className="mt-auto flex flex-col items-center gap-2">
        <ThemeToggle className={`${item} text-muted hover:bg-panel-raised hover:text-text`} />
        <Link href="/login" className={`${item} text-muted hover:bg-panel-raised hover:text-text`}>
          <DoorOpen size={20} strokeWidth={1.75} />
          Exit demo
        </Link>
      </div>
    </aside>
  );
}

export function RailLogo() {
  return (
    <div className="mb-8" aria-label="Distill">
      <BrandMark size={44} glow />
    </div>
  );
}

