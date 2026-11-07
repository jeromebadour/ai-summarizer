import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** One number with its glyph, label and a short note. Used on the profile and the admin console. */
export function StatTile({ icon: Icon, tone, label, value, note }: { icon: LucideIcon; tone: string; label: string; value: string; note?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-panel px-4 py-3.5">
      <div className={`flex items-center gap-2 text-[12.5px] font-semibold ${tone}`}>
        <Icon size={16} strokeWidth={2} />
        {label}
      </div>
      <div className="mt-1.5 font-mono text-[26px] font-semibold tracking-tight text-text">{value}</div>
      {note && <div className="mt-1 font-mono text-[11.5px] text-muted">{note}</div>}
    </div>
  );
}
