import { CircleCheck, LoaderCircle, Radio, TriangleExclamationPoint, type LucideIcon } from "lucide-react";

export type AppStatus =
  | { kind: "ready" }
  | { kind: "working"; label: string; elapsedMs: number }
  | { kind: "saved"; at: string; label?: string }
  | { kind: "error"; label: string };

const looks: Record<AppStatus["kind"], { icon: LucideIcon; tone: string; spin?: boolean }> = {
  ready: { icon: Radio, tone: "border-brand-line text-brand" },
  working: { icon: LoaderCircle, tone: "border-brand-line bg-brand-soft text-brand-strong", spin: true },
  saved: { icon: CircleCheck, tone: "border-brand-line bg-brand-soft text-brand-strong" },
  error: { icon: TriangleExclamationPoint, tone: "border-flag/40 bg-flag-soft text-flag" },
};

export function StatusPill({ status }: { status: AppStatus }) {
  const { icon: Icon, tone, spin } = looks[status.kind];
  const text =
    status.kind === "ready" ? "Ready" : status.kind === "saved" ? `${status.label ?? "Saved"} ${status.at}` : status.label;

  return (
    <div role="status" aria-live="polite" className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold ${tone}`}>
      <Icon size={14} strokeWidth={2.2} className={spin ? "animate-spin" : undefined} />
      {text}
      {status.kind === "working" && (
        <span className="font-mono text-[11.5px] font-medium opacity-80">{(status.elapsedMs / 1000).toFixed(1)} s</span>
      )}
    </div>
  );
}
