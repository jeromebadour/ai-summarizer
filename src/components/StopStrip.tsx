import { CalendarClock, Library, OctagonPause } from "lucide-react";
import Link from "next/link";

export type AppStop =
  /** A brake pulled from the console (all summaries, or guests while the viewer is a guest). */
  | { kind: "paused"; guests: boolean }
  /** The app's daily spend cap: back at midnight UTC, shown in the viewer's time. */
  | { kind: "dailyCap"; backAt: string };

/**
 * The app has stopped summaries for everyone (not this person's own limit): a chosen or planned state, so calm
 * indigo (no hatching behind text), never amber. It says what still works, and when it comes back if that is known.
 */
export function StopStrip({ stop }: { stop: AppStop }) {
  const Icon = stop.kind === "paused" ? OctagonPause : CalendarClock;
  const title =
    stop.kind === "paused"
      ? stop.guests
        ? "Summaries are paused for guests right now"
        : "Summaries are paused right now"
      : "Today's summaries are used up";
  const detail =
    stop.kind === "paused"
      ? stop.guests
        ? "Create an account to keep going; everything you made as a guest comes with you."
        : "Your saved summaries are all still here. New ones come back soon."
      : `New summaries are back at ${stop.backAt}. Your saved summaries are all still here.`;

  return (
    <section role="status" className="flex items-center gap-5 rounded-2xl border border-brand-line bg-brand-soft/60 px-6 py-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-brand-line bg-brand-soft text-brand-strong">
        <Icon size={20} strokeWidth={1.9} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <p className="mt-0.5 text-[13px] text-muted">{detail}</p>
      </div>
      <Link href="/saved" className="flex shrink-0 items-center gap-2 rounded-xl border border-brand-line px-4 py-2 text-[13px] font-semibold text-text hover:bg-brand-soft">
        <Library size={16} strokeWidth={2} className="text-brand-strong" />
        Saved
      </Link>
    </section>
  );
}
