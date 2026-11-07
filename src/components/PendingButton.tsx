"use client";

import { LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type PendingButtonProps = {
  /** The glyph as an element (<LogOut size={16} />), so server components can pass it in. */
  icon: ReactNode;
  label: string;
  /** What the app is doing while the form is sent ("Signing out"): never a silent wait. */
  pendingLabel: string;
  className: string;
  /** Size and stroke of the spinner that takes the glyph's place while pending. */
  iconSize?: number;
  strokeWidth?: number;
  iconClassName?: string;
  disabled?: boolean;
};

/** A submit button that shows its form's live state: a spinning glyph and what is happening, until the answer comes. */
export function PendingButton({ icon, label, pendingLabel, className, iconSize = 17, strokeWidth = 2, iconClassName, disabled }: PendingButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className={`${className} disabled:cursor-not-allowed`} aria-busy={pending}>
      {pending ? <LoaderCircle size={iconSize} strokeWidth={strokeWidth} className={`animate-spin ${iconClassName ?? ""}`} /> : icon}
      {pending ? pendingLabel : label}
    </button>
  );
}
