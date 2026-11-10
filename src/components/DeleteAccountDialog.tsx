"use client";

import { AtSign, Download, FileText, Monitor, UserX, X } from "@/components/glyphs";
import Link from "@/components/NavLink";
import { useActionState, useState } from "react";
import { deleteAccount } from "@/app/actions/account";
import { Avatar } from "@/components/Avatar";
import { Dialog, keepButton } from "@/components/Dialog";
import { Field } from "@/components/Field";
import { FormAlert } from "@/components/FormAlert";
import { PendingButton } from "@/components/PendingButton";
import type { Account } from "@/lib/profile";
import type { FormState } from "@/lib/server/rules";

type DeleteAccountDialogProps = {
  account: Account;
  summaries: number;
  devices: number;
  closeHref: string;
};

export function DeleteAccountDialog({ account, summaries, devices, closeHref }: DeleteAccountDialogProps) {
  const [state, action] = useActionState<FormState, FormData>(deleteAccount, undefined);
  const [confirm, setConfirm] = useState("");
  const matches = confirm.trim().toLowerCase() === account.username;

  return (
    <Dialog
      tone="clear"
      icon={UserX}
      title="Delete your account?"
      detail="Everything below is removed for good. This can't be undone."
      formAction={action}
      actions={
        <>
          <Link href={closeHref} className={keepButton}>
            <X size={17} strokeWidth={2} className="text-brand-strong" />
            Keep
          </Link>
          <PendingButton
            icon={<UserX size={17} strokeWidth={2} />}
            label="Delete account"
            pendingLabel="Deleting your account"
            disabled={!matches}
            className="flex items-center gap-2 rounded-xl bg-clear-strong px-4 py-2 text-[13.5px] font-semibold text-white hover:brightness-110 disabled:bg-clear-soft disabled:text-clear/60"
          />
        </>
      }
    >
      <div className="rounded-xl border border-border bg-paper">
        <div className="flex items-center gap-3 border-b border-border px-3.5 py-3">
          <Avatar name={account.name} colour={account.avatarColour} size={34} />
          <span>
            <span className="block text-[13.5px] font-semibold">{account.name}</span>
            <span className="font-mono text-[11.5px] text-muted">@{account.username}</span>
          </span>
        </div>
        <ul className="space-y-2 px-3.5 py-3 text-[13px]">
          <li className="flex items-center gap-2.5">
            <FileText size={15} strokeWidth={2} className="text-clear" />
            {summaries} {summaries === 1 ? "summary" : "summaries"} with their sources and figures
          </li>
          <li className="flex items-center gap-2.5">
            <Monitor size={15} strokeWidth={2} className="text-clear" />
            {devices} signed-in {devices === 1 ? "device" : "devices"}, signed out at once
          </li>
        </ul>
      </div>

      {summaries > 0 && (
        <a
          href="/api/export"
          download
          className="flex w-full items-center gap-2.5 rounded-xl border border-input/30 bg-input-soft px-3.5 py-2.5 text-[13px] font-semibold text-input hover:border-input/60"
        >
          <Download size={16} strokeWidth={2} />
          Export your data first
        </a>
      )}

      <Field
        icon={AtSign}
        label={`Type ${account.username} to confirm`}
        name="confirm"
        type="text"
        placeholder={account.username}
        value={confirm}
        onChange={setConfirm}
        autoComplete="off"
      />
      {state?.error && <FormAlert message={state.error} />}
    </Dialog>
  );
}
