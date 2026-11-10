import { FlaskConical } from "@/components/glyphs";
import Link from "@/components/NavLink";

function GhostRow({ width }: { width: string }) {
  return (
    <div className="flex items-center gap-5 rounded-xl border border-border/60 px-4 py-3.5">
      <span className="size-11 rounded-xl border border-border bg-panel-raised/60" />
      <span className="flex-1 space-y-2">
        <span className="block h-2.5 rounded-full bg-border-strong/70" style={{ width }} />
        <span className="block h-2 w-4/5 rounded-full bg-border/80" />
      </span>
      <span className="flex gap-1.5">
        <span className="h-6 w-11 rounded-md border border-border" />
        <span className="h-6 w-14 rounded-md border border-border" />
      </span>
      <span className="h-1 w-32 rounded-full bg-border" />
    </div>
  );
}

/** The empty state shared by Saved (the defaults) and a new account's profile. */
export function EmptyLibrary({
  title = "Nothing saved yet",
  detail = "Every summary you distill is saved here with its source, figures and checks.",
}: { title?: string; detail?: string }) {
  return (
    <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-panel p-5">
      <div className="ghost-rows space-y-2 opacity-70 [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" aria-hidden>
        <GhostRow width="46%" />
        <GhostRow width="38%" />
        <GhostRow width="52%" />
        <GhostRow width="34%" />
      </div>

      <div className="absolute inset-0 grid place-items-center">
        <div className="flex flex-col items-center text-center">
          <span className="grid size-16 place-items-center rounded-2xl border border-brand-line bg-brand-soft shadow-[0_0_60px_var(--glow)]">
            <svg width="30" height="30" viewBox="0 0 22 22" aria-hidden>
              <rect x="2" y="3" width="18" height="3.2" rx="1.6" fill="var(--brand-strong)" />
              <rect x="5" y="9.4" width="12" height="3.2" rx="1.6" fill="var(--brand-strong)" opacity="0.75" />
              <rect x="8" y="15.8" width="6" height="3.2" rx="1.6" fill="var(--brand-strong)" opacity="0.5" />
            </svg>
          </span>
          <h2 className="mt-5 text-[20px] font-semibold tracking-[-0.01em]">{title}</h2>
          <p className="mt-1.5 max-w-[360px] text-[13.5px] leading-relaxed text-muted">
            {detail}
          </p>
          <Link
            href="/"
            className="mt-6 flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-[14px] font-semibold text-on-brand shadow-[0_6px_24px_-8px_var(--brand)] hover:brightness-110"
          >
            <FlaskConical size={17} strokeWidth={2.2} />
            Distill your first text
          </Link>
        </div>
      </div>
    </section>
  );
}
