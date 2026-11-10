import { Check, CircleX, Database, Link2, LoaderCircle, PenLine, Send, ShieldCheck, type GlyphIcon } from "@/components/glyphs";
import { distillSteps, type DistillRun, type DistillStep } from "@/lib/summary";

const stepInfo: Record<DistillStep, { icon: GlyphIcon; label: string }> = {
  checking: { icon: ShieldCheck, label: "Checking your limit" },
  sending: { icon: Send, label: "Sending to Claude" },
  writing: { icon: PenLine, label: "Writing points" },
  linking: { icon: Link2, label: "Linking to source" },
  saving: { icon: Database, label: "Saving" },
};

export function DistillProgress({ run }: { run: DistillRun }) {
  const current = distillSteps.indexOf(run.step);

  return (
    <ol data-progress className="relative grid grid-cols-5 gap-2">
      {distillSteps.map((step, index) => {
        const { icon: Icon, label } = stepInfo[step];
        const done = index < current;
        const failed = index === current && run.failed !== undefined;
        const active = index === current && !failed;
        const ms = run.stepMs[step];
        return (
          <li key={step} className="relative flex flex-col items-center gap-2 text-center">
            {index > 0 && (
              // The copper line between two flasks; it flows once the run has reached this stage.
              <span
                className={`absolute right-1/2 top-[19px] h-[2px] w-full -translate-x-[19px] rounded-full ${done || active ? "copper-flow" : "bg-[var(--copper)]/35"}`}
                aria-hidden
              />
            )}
            {/* Each stage is a flask: full when done, filling while it runs, empty glass while it waits. */}
            <span
              data-flask={failed ? "failed" : done ? "full" : active ? "filling" : "empty"}
              className={`flask relative z-10 grid h-10 w-9 place-items-center overflow-hidden border-[1.5px] ${
                failed ? "border-flag bg-flag-soft text-flag" : done ? "border-[#6d8ce0] text-on-brand" : active ? "border-brand-strong text-brand-strong" : "border-border-strong bg-panel text-faint"
              }`}
            >
              <span className="relative z-10">
                {failed ? (
                  <CircleX size={17} strokeWidth={2.2} />
                ) : done ? (
                  <Check size={16} strokeWidth={2.6} />
                ) : active ? (
                  <LoaderCircle size={17} strokeWidth={2.2} className="animate-spin" />
                ) : (
                  <Icon size={16} strokeWidth={1.9} />
                )}
              </span>
            </span>
            <span className={`text-[11.5px] font-semibold leading-tight ${failed ? "text-flag" : done || active ? "text-text" : "text-faint"}`}>{label}</span>
            <span className={`font-mono text-[10.5px] ${failed ? "text-flag" : active ? "text-brand-strong" : "text-faint"}`}>
              {failed ? "failed" : done && ms !== undefined ? `${ms} ms` : active ? "now" : run.failed ? "skipped" : "waiting"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
