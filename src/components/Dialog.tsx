import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Tone = "brand" | "clear" | "figure" | "verify";

/** The dialog's colour is the action's colour: indigo, rose (removes or stops), owner gold, teal (restores). */
const tones: Record<Tone, { border: string; line: string; badge: string }> = {
  brand: { border: "border-brand-line", line: "via-brand-strong/70", badge: "border-brand-line bg-brand-soft text-brand-strong" },
  clear: { border: "border-clear/30", line: "via-clear/70", badge: "border-clear/35 bg-clear-soft text-clear" },
  figure: { border: "border-figure/30", line: "via-figure/70", badge: "border-figure/35 bg-figure-soft text-figure" },
  verify: { border: "border-verify/30", line: "via-verify/70", badge: "border-verify/35 bg-verify-soft text-verify" },
};

type DialogProps = {
  tone: Tone;
  icon: LucideIcon;
  title: string;
  detail: string;
  children?: ReactNode;
  actions: ReactNode;
  /** When set, the content and the actions are one form sent to this action (a dialog that changes something). */
  formAction?: (form: FormData) => void;
};

/** The one dialog shell: blurred page behind, glyph + title + one line, content, actions in the footer. */
export function Dialog({ tone, icon: Icon, title, detail, children, actions, formAction }: DialogProps) {
  const look = tones[tone];
  const body = (
    <>
      {children && <div className="space-y-4 px-6 max-md:px-4">{children}</div>}
      <div className="mt-6 flex justify-end gap-2 border-t border-border bg-panel-raised/40 px-6 py-4 max-md:flex-wrap max-md:px-4 max-md:[&>*]:justify-center max-md:[&>*:last-child]:flex-1">{actions}</div>
    </>
  );
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--overlay)] backdrop-blur-[3px] max-md:px-3">
      <div
        role={tone === "clear" ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={`w-[460px] overflow-hidden rounded-2xl max-md:max-h-[calc(100dvh-24px)] max-md:w-full max-md:overflow-y-auto border bg-panel shadow-[var(--shadow-dialog)] ${look.border}`}
      >
        <div className={`h-px bg-gradient-to-r from-transparent to-transparent ${look.line}`} aria-hidden />
        <div className="flex items-start gap-4 px-6 pb-5 pt-6 max-md:gap-3 max-md:px-4 max-md:pt-5">
          <span className={`grid size-11 shrink-0 place-items-center rounded-xl border ${look.badge}`}>
            <Icon size={20} strokeWidth={1.9} />
          </span>
          <div className="min-w-0">
            <h2 id="dialog-title" className="text-[17px] font-semibold">
              {title}
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">{detail}</p>
          </div>
        </div>
        {formAction ? <form action={formAction}>{body}</form> : body}
      </div>
    </div>
  );
}

export const keepButton =
  "flex items-center gap-2 rounded-xl border border-brand-line px-4 py-2 text-[13.5px] font-semibold text-text hover:bg-brand-soft disabled:opacity-40";
