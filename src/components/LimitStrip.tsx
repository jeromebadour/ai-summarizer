import { Hourglass, Library } from "lucide-react";
import Link from "@/components/NavLink";

type LimitStripProps = {
  limit: number;
  /** Minutes past the hour window start (0 = an hour ago, 60 = now) at which each summary was made. */
  usedAt: number[];
  now: string;
  nextFree: string;
  minutesToNext: number;
};

/** Limit reached is a normal state, not an error: calm indigo, and it says exactly when the next one frees up. */
export function LimitStrip({ limit, usedAt, now, nextFree, minutesToNext }: LimitStripProps) {
  return (
    <section role="status" className="flex items-center gap-6 rounded-2xl border border-brand-line bg-brand-soft/60 px-6 py-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-brand-line bg-brand-soft text-brand-strong">
        <Hourglass size={20} strokeWidth={1.9} />
      </span>
      <div className="w-[330px] shrink-0">
        <h2 className="text-[15px] font-semibold">
          You&apos;ve used all {limit} for this hour
        </h2>
        <p className="mt-0.5 text-[13px] text-muted">
          The next one frees up at <span className="font-semibold text-text">{nextFree}</span>, in {minutesToNext} min. Each one frees an hour after you
          used it.
        </p>
      </div>

      <div className="min-w-0 flex-1" aria-hidden>
        <div className="relative h-9">
          <div className="absolute inset-x-0 top-1/2 h-px bg-border-strong" />
          {usedAt.map((minute, index) => (
            <span
              key={index}
              className={`absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-panel ${index === 0 ? "bg-brand-strong ring-4 ring-brand-soft" : "bg-brand"}`}
              style={{ left: `${(minute / 60) * 100}%` }}
            />
          ))}
          <span className="absolute right-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-text" />
        </div>
        <div className="relative h-4 font-mono text-[10.5px] text-muted">
          <span className="absolute left-0">1 hour ago</span>
          <span className="absolute -translate-x-1/2 whitespace-nowrap text-brand-strong" style={{ left: `${(usedAt[0] / 60) * 100}%` }}>
            frees at {nextFree}
          </span>
          <span className="absolute right-0 text-text">now {now}</span>
        </div>
      </div>

      <Link href="/saved" className="flex shrink-0 items-center gap-2 rounded-xl border border-brand-line px-4 py-2 text-[13px] font-semibold text-text hover:bg-brand-soft">
        <Library size={16} strokeWidth={2} className="text-brand-strong" />
        Saved
      </Link>
    </section>
  );
}
