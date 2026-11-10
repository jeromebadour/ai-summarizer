import { CalendarClock, CalendarX, Library, OctagonPause, UserRoundX, type GlyphIcon } from "@/components/glyphs";
import Link from "@/components/NavLink";

/** Why summaries can't run right now, for this person, beyond their hourly limit (that one has its own strip). */
export type AppStop =
  /** A brake pulled from the console (all summaries, or guests while the viewer is a guest). */
  | { kind: "paused"; guests: boolean }
  /** The app's daily spend cap: back at midnight UTC, shown in the viewer's time. */
  | { kind: "dailyCap"; backAt: string }
  /** The person's own 30 a day, or the guests' shared 50 a day. */
  | { kind: "dayLimit"; backAt: string; guests: boolean }
  /** The month's budget: back on the 1st. */
  | { kind: "monthCap" }
  | { kind: "suspended" };

const looks: Record<AppStop["kind"], GlyphIcon> = {
  paused: OctagonPause,
  dailyCap: CalendarClock,
  dayLimit: CalendarClock,
  monthCap: CalendarX,
  suspended: UserRoundX,
};

function words(stop: AppStop): { title: string; detail: string } {
  const kept = "Your saved summaries are all still here.";
  switch (stop.kind) {
    case "paused":
      return stop.guests
        ? { title: "Summaries are paused for guests right now", detail: "Create an account to keep going; everything you made as a guest comes with you." }
        : { title: "Summaries are paused right now", detail: `${kept} New ones come back soon.` };
    case "dailyCap":
      return { title: "Today's summaries are used up", detail: `New summaries are back at ${stop.backAt}. ${kept}` };
    case "dayLimit":
      return stop.guests
        ? { title: "Guests have used today's summaries", detail: `Back at ${stop.backAt}, or create an account for your own 30 a day.` }
        : { title: "You've used all 30 for today", detail: `Back at ${stop.backAt}. ${kept}` };
    case "monthCap":
      return { title: "Summaries are paused until the 1st", detail: `This month's budget is used. ${kept}` };
    case "suspended":
      return { title: "This account is suspended", detail: "Your saved summaries are still here to read and export." };
  }
}

/**
 * Summaries can't run right now: a chosen, planned or known state, so calm indigo (no hatching behind text), never
 * amber. It says what still works, and when it comes back if that is known.
 */
export function StopStrip({ stop }: { stop: AppStop }) {
  const Icon = looks[stop.kind];
  const { title, detail } = words(stop);
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
