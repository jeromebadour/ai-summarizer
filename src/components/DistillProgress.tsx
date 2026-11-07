import { Check, CircleX, Database, Link2, LoaderCircle, PenLine, Send, ShieldCheck, type LucideIcon } from "lucide-react";
import { distillSteps, type DistillRun, type DistillStep } from "@/lib/summary";

const stepInfo: Record<DistillStep, { icon: LucideIcon; label: string }> = {
  checking: { icon: ShieldCheck, label: "Checking your limit" },
  sending: { icon: Send, label: "Sending to Claude" },
  writing: { icon: PenLine, label: "Writing points" },
  linking: { icon: Link2, label: "Linking to source" },
  saving: { icon: Database, label: "Saving" },
};

export function DistillProgress({ run }: { run: DistillRun }) {
  const current = distillSteps.indexOf(run.step);

  return (
    <ol className="relative grid grid-cols-5 gap-2">
      {distillSteps.map((step, index) => {
        const { icon: Icon, label } = stepInfo[step];
        const done = index < current;
        const failed = index === current && run.failed !== undefined;
        const active = index === current && !failed;
        const ms = run.stepMs[step];
        return (
          <li key={step} className="relative flex flex-col items-center gap-2 text-center">
            {index > 0 && (
              <span
                className={`absolute right-1/2 top-[17px] h-px w-full -translate-x-[18px] ${done || active ? "bg-brand-line" : "bg-border"}`}
                aria-hidden
              />
            )}
            <span
              className={`relative z-10 grid size-[34px] place-items-center rounded-full border ${
                failed
                  ? "border-flag bg-flag-soft text-flag shadow-[0_0_0_5px_var(--flag-soft)]"
                  : done
                  ? "border-brand bg-brand text-on-brand"
                  : active
                    ? "border-brand bg-panel-raised text-brand-strong shadow-[0_0_0_5px_var(--brand-soft)]"
                    : "border-border bg-panel text-faint"
              }`}
            >
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
