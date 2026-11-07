"use client";

import { AtSign, Check, IdCard, LockKeyhole, Mail, UserPen, X } from "lucide-react";
import Link from "@/components/NavLink";
import { useActionState, useState } from "react";
import { updateProfile } from "@/app/actions/account";
import { Avatar } from "@/components/Avatar";
import { Dialog, keepButton } from "@/components/Dialog";
import { Field } from "@/components/Field";
import { FormAlert } from "@/components/FormAlert";
import { PendingButton } from "@/components/PendingButton";
import { UsernameStatus } from "@/components/UsernameStatus";
import { useUsernameCheck } from "@/components/useUsernameCheck";
import type { Account } from "@/lib/profile";
import type { FormState } from "@/lib/server/rules";
import { normalizeUsername } from "@/lib/username";

export function EditProfileDialog({ account, closeHref }: { account: Account; closeHref: string }) {
  const [state, action] = useActionState<FormState, FormData>(updateProfile, undefined);
  const [name, setName] = useState(account.name);
  const { username, status: usernameStatus, change: changeUsername } = useUsernameCheck(account.username);
  const [email, setEmail] = useState(account.email);
  const [password, setPassword] = useState("");

  const usernameChanged = normalizeUsername(username) !== account.username;
  const emailChanged = email.trim().toLowerCase() !== account.email;
  const needsPassword = usernameChanged || emailChanged;
  const changed = name.trim() !== account.name || usernameChanged || emailChanged;
  const usernameOk = !usernameChanged || usernameStatus.status === "available";
  const ready = changed && name.trim().length > 0 && usernameOk && (!needsPassword || password.length > 0);

  return (
    <Dialog
      tone="brand"
      icon={UserPen}
      title="Edit profile"
      detail="Changing your username or email asks for your password."
      formAction={action}
      actions={
        <>
          <Link href={closeHref} className={keepButton}>
            <X size={17} strokeWidth={2} className="text-brand-strong" />
            Keep
          </Link>
          <PendingButton
            icon={<Check size={17} strokeWidth={2} />}
            label="Save"
            pendingLabel="Saving"
            disabled={!ready}
            className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-[13.5px] font-semibold text-on-brand hover:brightness-110 disabled:bg-brand-soft disabled:text-brand-strong/60"
          />
        </>
      }
    >
      <div className="flex items-center gap-3 rounded-xl border border-border bg-paper px-3.5 py-3">
        <Avatar name={name || account.name} colour={account.avatarColour} size={40} />
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-semibold">{name || account.name}</span>
          <span className="font-mono text-[11.5px] text-brand-strong">@{normalizeUsername(username) || account.username}</span>
        </span>
      </div>
      <Field icon={IdCard} label="Name" name="name" type="text" placeholder="What should we call you?" value={name} onChange={setName} autoComplete="name" />
      <Field
        icon={AtSign}
        label="Username"
        name="username"
        type="text"
        placeholder={account.username}
        value={username}
        onChange={changeUsername}
        autoComplete="username"
        trailing={<UsernameStatus check={usernameStatus} />}
      />
      <Field icon={Mail} label="Email" name="email" type="email" placeholder={account.email} value={email} onChange={setEmail} autoComplete="email" />
      {needsPassword && (
        <Field icon={LockKeyhole} label="Current password" name="password" type="password" placeholder="Confirm it's you" value={password} onChange={setPassword} autoComplete="current-password" />
      )}
      {state?.error && <FormAlert message={state.error} />}
    </Dialog>
  );
}
