"use client";

import { ArrowRight, AtSign, FileText, IdCard, LockKeyhole, Mail, UserRoundPlus, X } from "lucide-react";
import { useState } from "react";
import { Dialog, keepButton } from "@/components/Dialog";
import { Field } from "@/components/Field";
import { PasswordCheck } from "@/components/PasswordCheck";
import { UsernameStatus } from "@/components/UsernameStatus";
import { passwordAccepted } from "@/lib/password";
import { checkUsernameFormat, type UsernameCheck } from "@/lib/username";

type KeepSummariesDialogProps = {
  summaries: number;
  initial?: { name: string; username: string; usernameStatus: UsernameCheck; email: string; password: string };
};

export function KeepSummariesDialog({ summaries, initial }: KeepSummariesDialogProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [username, setUsername] = useState(initial?.username ?? "");
  const [usernameStatus, setUsernameStatus] = useState<UsernameCheck>(initial?.usernameStatus ?? { status: "empty" });
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState(initial?.password ?? "");
  const ready = name.trim() !== "" && usernameStatus.status === "available" && email.includes("@") && passwordAccepted(password, email);

  return (
    <Dialog
      tone="brand"
      icon={UserRoundPlus}
      title="Keep your summaries"
      detail="Create an account. Everything you made as a guest comes with you."
      actions={
        <>
          <button type="button" className={keepButton}>
            <X size={17} strokeWidth={2} className="text-brand-strong" />
            Not now
          </button>
          <button
            type="button"
            disabled={!ready}
            className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-[13.5px] font-semibold text-on-brand hover:brightness-110 disabled:bg-brand-soft disabled:text-brand-strong/60"
          >
            <UserRoundPlus size={17} strokeWidth={2} />
            Create account
          </button>
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
      <Field icon={IdCard} label="Name" type="text" placeholder="What should we call you?" value={name} onChange={setName} autoComplete="name" />
      <Field
        icon={AtSign}
        label="Username"
        type="text"
        placeholder="maya_k"
        value={username}
        onChange={(value) => {
          setUsername(value);
          setUsernameStatus(checkUsernameFormat(value));
        }}
        autoComplete="username"
        trailing={<UsernameStatus check={usernameStatus} />}
      />
      <Field icon={Mail} label="Email" type="email" placeholder="you@company.com" value={email} onChange={setEmail} autoComplete="email" />
      <Field icon={LockKeyhole} label="Password" type="password" placeholder="Choose a password" value={password} onChange={setPassword} autoComplete="new-password" />
      <PasswordCheck password={password} email={email} />
    </Dialog>
  );
}
