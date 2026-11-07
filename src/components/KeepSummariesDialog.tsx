"use client";

import { ArrowRight, AtSign, FileText, IdCard, LockKeyhole, Mail, UserRoundPlus, X } from "lucide-react";
import Link from "@/components/NavLink";
import { useActionState, useState } from "react";
import { upgradeGuest } from "@/app/actions/account";
import { Dialog, keepButton } from "@/components/Dialog";
import { Field } from "@/components/Field";
import { FormAlert } from "@/components/FormAlert";
import { PasswordCheck } from "@/components/PasswordCheck";
import { PendingButton } from "@/components/PendingButton";
import { UsernameStatus } from "@/components/UsernameStatus";
import { useUsernameCheck } from "@/components/useUsernameCheck";
import { passwordAccepted } from "@/lib/password";
import type { FormState } from "@/lib/server/rules";

/** A guest becomes a real account in place: the same user, so every summary comes along without copying. */
export function KeepSummariesDialog({ summaries, closeHref }: { summaries: number; closeHref: string }) {
  const [state, action] = useActionState<FormState, FormData>(upgradeGuest, undefined);
  const [name, setName] = useState("");
  const { username, status: usernameStatus, change: changeUsername } = useUsernameCheck();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const ready = name.trim() !== "" && usernameStatus.status === "available" && email.includes("@") && passwordAccepted(password, email);

  return (
    <Dialog
      tone="brand"
      icon={UserRoundPlus}
      title="Keep your summaries"
      detail="Create an account. Everything you made as a guest comes with you."
      formAction={action}
      actions={
        <>
          <Link href={closeHref} className={keepButton}>
            <X size={17} strokeWidth={2} className="text-brand-strong" />
            Not now
          </Link>
          <PendingButton
            icon={<UserRoundPlus size={17} strokeWidth={2} />}
            label="Create account"
            pendingLabel="Creating your account"
            disabled={!ready}
            className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-[13.5px] font-semibold text-on-brand hover:brightness-110 disabled:bg-brand-soft disabled:text-brand-strong/60"
          />
        </>
      }
    >
      <div className="flex items-center gap-3 rounded-xl border border-input/30 bg-input-soft px-3.5 py-2.5 text-[13px] font-semibold text-input">
        <FileText size={16} strokeWidth={2} />
        {summaries} {summaries === 1 ? "summary" : "summaries"}
        <ArrowRight size={15} strokeWidth={2} />
        <span className="text-text">your new account</span>
        <span className="ml-auto font-mono text-[11.5px] font-medium">10 an hour</span>
      </div>
      <Field icon={IdCard} label="Name" name="name" type="text" placeholder="What should we call you?" value={name} onChange={setName} autoComplete="name" />
      <Field
        icon={AtSign}
        label="Username"
        name="username"
        type="text"
        placeholder="maya_k"
        value={username}
        onChange={changeUsername}
        autoComplete="username"
        trailing={<UsernameStatus check={usernameStatus} />}
      />
      <Field icon={Mail} label="Email" name="email" type="email" placeholder="you@company.com" value={email} onChange={setEmail} autoComplete="email" />
      <Field icon={LockKeyhole} label="Password" name="password" type="password" placeholder="Choose a password" value={password} onChange={setPassword} autoComplete="new-password" />
      <PasswordCheck password={password} email={email} />
      {state?.error && <FormAlert message={state.error} calm={state.code === "email_exists"} />}
    </Dialog>
  );
}
