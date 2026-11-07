"use client";

import { Eye, EyeOff, KeyRound, LockKeyhole, LogOut, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { changePassword } from "@/app/actions/account";
import { Dialog, keepButton } from "@/components/Dialog";
import { Field } from "@/components/Field";
import { FormAlert } from "@/components/FormAlert";
import { PasswordCheck } from "@/components/PasswordCheck";
import { PendingButton } from "@/components/PendingButton";
import { passwordAccepted } from "@/lib/password";
import type { FormState } from "@/lib/server/rules";

type ChangePasswordDialogProps = {
  email: string;
  otherDevices: number;
  closeHref: string;
};

export function ChangePasswordDialog({ email, otherDevices, closeHref }: ChangePasswordDialogProps) {
  const [state, action] = useActionState<FormState, FormData>(changePassword, undefined);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [shown, setShown] = useState(false);
  const [signOutOthers, setSignOutOthers] = useState(true);
  const ready = current.length > 0 && passwordAccepted(next, email) && next !== current;

  const eye = (
    <button type="button" aria-label={shown ? "Hide passwords" : "Show passwords"} onClick={() => setShown((s) => !s)} className="text-muted hover:text-text">
      {shown ? <EyeOff size={17} strokeWidth={2} /> : <Eye size={17} strokeWidth={2} />}
    </button>
  );

  return (
    <Dialog
      tone="brand"
      icon={KeyRound}
      title="Change password"
      detail="Enter your current password, then the new one."
      formAction={action}
      actions={
        <>
          <Link href={closeHref} className={keepButton}>
            <X size={17} strokeWidth={2} className="text-brand-strong" />
            Keep
          </Link>
          <PendingButton
            icon={<KeyRound size={17} strokeWidth={2} />}
            label="Change"
            pendingLabel="Changing"
            disabled={!ready}
            className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-[13.5px] font-semibold text-on-brand hover:brightness-110 disabled:bg-brand-soft disabled:text-brand-strong/60"
          />
        </>
      }
    >
      <Field icon={LockKeyhole} label="Current password" name="current" type={shown ? "text" : "password"} placeholder="Your password now" value={current} onChange={setCurrent} autoComplete="current-password" trailing={eye} />
      <Field icon={KeyRound} label="New password" name="next" type={shown ? "text" : "password"} placeholder="Choose a new password" value={next} onChange={setNext} autoComplete="new-password" />
      <PasswordCheck password={next} email={email} />
      {otherDevices > 0 && (
        <button
          type="button"
          role="switch"
          aria-checked={signOutOthers}
          onClick={() => setSignOutOthers((on) => !on)}
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-panel-raised/40 px-3.5 py-3 text-left"
        >
          <LogOut size={16} strokeWidth={2} className="text-clear" />
          <span className="flex-1 text-[13px]">
            Sign out the other {otherDevices} {otherDevices === 1 ? "device" : "devices"}
          </span>
          <span className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${signOutOthers ? "bg-brand" : "bg-border-strong"}`}>
            <span className={`size-4 rounded-full bg-white transition-transform ${signOutOthers ? "translate-x-4" : ""}`} />
          </span>
        </button>
      )}
      <input type="hidden" name="signOutOthers" value={otherDevices > 0 && signOutOthers ? "on" : "off"} />
      {state?.error && <FormAlert message={state.error} />}
    </Dialog>
  );
}
