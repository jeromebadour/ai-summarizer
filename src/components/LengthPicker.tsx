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

export function LengthPicker({ value }: { value: SummaryLength }) {
  return (
    <div className="flex gap-1.5 rounded-xl border border-border bg-bg/60 p-1">
      {(Object.keys(lengthStyles) as SummaryLength[]).map((key) => {
        const { icon: Icon, label, on, off } = lengthStyles[key];
        const selected = key === value;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={selected}
            className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-[13px] font-semibold transition-colors ${
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
