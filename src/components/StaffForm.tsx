"use client";

import { Eye, MessageSquareText, X, type LucideIcon } from "lucide-react";
import Link from "@/components/NavLink";
import { useActionState, useState, type ReactNode } from "react";
import { Dialog, keepButton } from "@/components/Dialog";
import { Field } from "@/components/Field";
import { FormAlert } from "@/components/FormAlert";
import { PendingButton } from "@/components/PendingButton";
import type { FormState } from "@/lib/server/rules";

export type StaffAct = (state: FormState, form: FormData) => Promise<FormState>;

/**
 * What every staff dialog needs from the page under it. `act` is the server action, passed in by the live console
 * only: the public demo has none, so its dialogs show what an action asks for and send nothing.
 */
export type StaffProps = {
  demo: boolean;
  act?: StaffAct;
  /** The page under the dialog: Cancel goes back to it, and so does a confirmed action (saying what was done). */
  back: string;
};

type StaffFormProps = {
  staff: StaffProps;
  kind: string;
  tone: "brand" | "clear" | "figure" | "verify";
  icon: LucideIcon;
  title: string;
  detail: string;
  confirm: { icon: LucideIcon; label: string; pending: string; className: string };
  /** Sent with the form: who it is about, a role, the caps. */
  fields?: Record<string, string>;
  /** A sample reason, shown only in the demo so its pictures read as real use. */
  example: string;
  /** False while the dialog's own inputs aren't valid yet (a cap out of range, the same role). */
  ready?: boolean;
  children?: ReactNode;
};

const noop: StaffAct = async () => undefined;

/** The one staff-action dialog: the facts, a reason for the audit log, Cancel and the confirm button. */
export function StaffForm({ staff, kind, tone, icon, title, detail, confirm, fields = {}, example, ready = true, children }: StaffFormProps) {
  const [state, action] = useActionState(staff.act ?? noop, undefined);
  const [reason, setReason] = useState(staff.demo ? example : "");
  const Confirm = confirm.icon;
  const live = !staff.demo && staff.act;

  return (
    <Dialog
      tone={tone}
      icon={icon}
      title={title}
      detail={detail}
      formAction={live ? action : undefined}
      actions={
        <>
          <Link href={staff.back as never} className={keepButton} scroll={false}>
            <X size={17} strokeWidth={2} className="text-brand-strong" />
            {staff.demo ? "Close" : "Cancel"}
          </Link>
          {live ? (
            <PendingButton
              icon={<Confirm size={17} strokeWidth={2} />}
              label={confirm.label}
              pendingLabel={confirm.pending}
              disabled={!ready || reason.trim().length < 3}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[13.5px] font-semibold hover:brightness-110 disabled:opacity-45 ${confirm.className}`}
            />
          ) : (
            <span className="flex items-center gap-2 rounded-xl border border-figure/40 bg-figure-soft px-4 py-2 text-[13px] font-semibold text-figure">
              <Eye size={16} strokeWidth={2} />
              Read-only demo · nothing is sent
            </span>
          )}
        </>
      }
    >
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="back" value={staff.back} />
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {children}
      <Field icon={MessageSquareText} label="Reason (kept in the audit log)" name="reason" type="text" placeholder="Why, in a few words" value={reason} onChange={setReason} autoComplete="off" />
      {state?.error && <FormAlert message={state.error} calm={state.code === "nothing"} />}
    </Dialog>
  );
}
