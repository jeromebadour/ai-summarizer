import { FileText, KeyRound, LockKeyhole, MailCheck, LogIn, ShieldUser, UserRound, UserRoundCheck, UserRoundPlus, UserRoundX, type GlyphIcon } from "@/components/glyphs";
import type { ActivityKind } from "@/lib/admin";

/** Each kind of event has its own glyph and colour, the same on the Overview and in the Activity log. */
export const activityLook: Record<ActivityKind, { icon: GlyphIcon; tone: string; label: string }> = {
  signup: { icon: UserRoundPlus, tone: "border-input/35 bg-input-soft text-input", label: "Signed up" },
  guest: { icon: UserRound, tone: "border-input/35 bg-input-soft text-input", label: "Guest session" },
  signin: { icon: LogIn, tone: "border-medium/35 bg-medium-soft text-medium", label: "Signed in" },
  signinFailed: { icon: LockKeyhole, tone: "border-clear/35 bg-clear-soft text-clear", label: "Sign-in refused" },
  emailConfirmed: { icon: MailCheck, tone: "border-verify/35 bg-verify-soft text-verify", label: "Email confirmed" },
  passwordReset: { icon: KeyRound, tone: "border-medium/35 bg-medium-soft text-medium", label: "Password reset" },
  upgrade: { icon: UserRoundCheck, tone: "border-verify/35 bg-verify-soft text-verify", label: "Kept their summaries" },
  summary: { icon: FileText, tone: "border-brand-line bg-brand-soft text-brand-strong", label: "Distilled" },
  delete: { icon: UserRoundX, tone: "border-clear/35 bg-clear-soft text-clear", label: "Deleted account" },
  staff: { icon: ShieldUser, tone: "border-figure/35 bg-figure-soft text-figure", label: "Staff action" },
};

export function ActivityChip({ kind }: { kind: ActivityKind }) {
  const { icon: Icon, tone, label } = activityLook[kind];
  return (
    <span className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11.5px] font-semibold ${tone}`}>
      <Icon size={13} strokeWidth={2.2} />
      {label}
    </span>
  );
}
