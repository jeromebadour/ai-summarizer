import { AlignLeft, List, Minus, type LucideIcon } from "lucide-react";
import type { SummaryLength } from "@/lib/summary";

export const lengthStyles: Record<SummaryLength, { icon: LucideIcon; label: string; on: string; off: string }> = {
  short: {
    icon: Minus,
    label: "Short",
    on: "border-short bg-short-soft text-short",
    off: "text-short/80 hover:bg-short-soft",
  },
  medium: {
    icon: AlignLeft,
    label: "Medium",
    on: "border-medium bg-medium-soft text-medium",
    off: "text-medium/80 hover:bg-medium-soft",
  },
  bullets: {
    icon: List,
    label: "Bullets",
    on: "border-bullets bg-bullets-soft text-bullets",
    off: "text-bullets/80 hover:bg-bullets-soft",
  },
};

/** Used inside the Distill workspace (a client component), so the buttons can switch the length. */
export function LengthPicker({ value, onChange, disabled = false }: { value: SummaryLength; onChange?: (length: SummaryLength) => void; disabled?: boolean }) {
  return (
    <div className="flex gap-1.5 rounded-xl border border-border bg-bg/60 p-1 max-md:w-full">
      {(Object.keys(lengthStyles) as SummaryLength[]).map((key) => {
        const { icon: Icon, label, on, off } = lengthStyles[key];
        const selected = key === value;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange?.(key)}
            className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-[13px] font-semibold transition-colors max-md:flex-1 max-md:justify-center max-md:px-2 disabled:cursor-not-allowed ${
              selected ? on : `border-transparent ${off}`
            }`}
          >
            <Icon size={16} strokeWidth={2} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
