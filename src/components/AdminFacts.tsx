import type { LucideIcon } from "lucide-react";
import type { ServerHealth } from "@/lib/admin";

/** Plain words for the box's state, each with its own colour. Amber only when it is really under strain. */
export const healthLook: Record<ServerHealth, { label: string; tone: string; bar: string }> = {
  comfortable: { label: "Running comfortably", tone: "text-verify", bar: "bg-verify" },
  busy: { label: "Getting busy", tone: "text-figure", bar: "bg-figure" },
  strained: { label: "Under strain", tone: "text-flag", bar: "bg-flag" },
};

/** One labelled fact on a line: glyph, label, value on the right. `alert` turns the whole line amber. */
export function Fact({ icon: Icon, tone, label, value, alert = false }: { icon: LucideIcon; tone: string; label: string; value: string; alert?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={15} strokeWidth={2} className={`shrink-0 ${alert ? "text-flag" : tone}`} />
      <span className={`text-[12.5px] ${alert ? "text-flag" : "text-muted"}`}>{label}</span>
      <span className={`ml-auto font-mono text-[12px] ${alert ? "text-flag" : "text-text"}`}>{value}</span>
    </div>
  );
}
