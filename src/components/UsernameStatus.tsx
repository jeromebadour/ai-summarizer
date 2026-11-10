import { CircleCheck, LoaderCircle, TriangleExclamationPoint } from "@/components/glyphs";
import type { UsernameCheck } from "@/lib/username";

export function UsernameStatus({ check }: { check: UsernameCheck }) {
  if (check.status === "empty") return null;
  const looks = {
    checking: { icon: LoaderCircle, text: "Checking", tone: "text-brand-strong", spin: true },
    available: { icon: CircleCheck, text: "Available", tone: "text-verify", spin: false },
    taken: { icon: TriangleExclamationPoint, text: "Taken", tone: "text-flag", spin: false },
    invalid: { icon: TriangleExclamationPoint, text: check.status === "invalid" ? check.reason : "", tone: "text-flag", spin: false },
  } as const;
  const look = looks[check.status];
  const Icon = look.icon;
  return (
    <span aria-live="polite" className={`flex shrink-0 items-center gap-1.5 text-[12px] font-semibold ${look.tone}`}>
      <Icon size={14} strokeWidth={2.2} className={look.spin ? "animate-spin" : undefined} />
      {look.text}
    </span>
  );
}
