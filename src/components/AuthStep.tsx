import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import Link from "@/components/NavLink";

/** Each step's colour carries its meaning: blue for something arriving, indigo for a calm or chosen state. */
const tones = {
  arriving: "border-input/35 bg-input-soft text-input",
  calm: "border-brand-line bg-brand-soft text-brand-strong",
  done: "border-verify/35 bg-verify-soft text-verify",
} as const;

/**
 * One step of signing in that isn't the sign-in form itself (check your inbox, forgot password, set a new password,
 * a link that ran out): a glyph, a title, one line, the step's own controls, and a way back.
 */
export function AuthStep({
  icon: Icon,
  tone,
  title,
  lead,
  back,
  footer,
  children,
}: {
  icon: LucideIcon;
  tone: keyof typeof tones;
  title: string;
  lead: React.ReactNode;
  back?: { href: string; label: string };
  /** In place of `back` when the way back is an action (sign out, keep the current email). */
  footer?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="w-[400px]">
      <span className={`grid size-12 place-items-center rounded-2xl border ${tones[tone]}`}>
        <Icon size={22} strokeWidth={2} />
      </span>
      <h1 className="mt-5 text-[24px] font-semibold tracking-[-0.015em]">{title}</h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{lead}</p>
      {children && <div className="mt-6 space-y-4">{children}</div>}
      {back && (
        <Link href={back.href as never} className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-strong hover:text-text">
          <ArrowLeft size={15} strokeWidth={2.1} />
          {back.label}
        </Link>
      )}
      {footer && <div className="mt-6">{footer}</div>}
    </div>
  );
}
