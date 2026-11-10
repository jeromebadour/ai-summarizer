import { Info, TriangleExclamationPoint } from "@/components/glyphs";
import type { ReactNode } from "react";

/**
 * The one line a form uses to answer a refusal. `calm` is for a normal state with a way forward (an email that
 * already has an account): indigo with an info glyph. Everything else is a real problem: amber.
 */
export function FormAlert({ message, calm = false, action }: { message: string; calm?: boolean; action?: ReactNode }) {
  return (
    <p
      role="alert"
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-semibold ${
        calm ? "border-brand-line bg-brand-soft text-brand-strong" : "border-flag/30 bg-flag-soft text-flag"
      }`}
    >
      {calm ? (
        <Info size={15} strokeWidth={2.2} className="shrink-0" />
      ) : (
        <TriangleExclamationPoint size={15} strokeWidth={2.2} className="shrink-0" />
      )}
      <span className="flex-1">{message}</span>
      {action}
    </p>
  );
}
