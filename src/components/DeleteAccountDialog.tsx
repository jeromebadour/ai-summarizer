"use client";

import { AtSign, Download, FileText, Monitor, UserX, X } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Dialog, keepButton } from "@/components/Dialog";
import { Field } from "@/components/Field";
import type { Account } from "@/lib/profile";

type DeleteAccountDialogProps = {
  account: Account;
  summaries: number;
  devices: number;
  initialConfirm?: string;
};

export function DeleteAccountDialog({ account, summaries, devices, initialConfirm = "" }: DeleteAccountDialogProps) {
  const [confirm, setConfirm] = useState(initialConfirm);
  const matches = confirm.trim().toLowerCase() === account.username;

  return (
    <Dialog
      tone="clear"
      icon={UserX}
      title="Delete your account?"
      detail="Everything below is removed for good. This can't be undone."
      actions={
        <>
          <button type="button" className={keepButton}>
            <X size={17} strokeWidth={2} className="text-brand-strong" />
            Keep
          </button>
          <button
            type="button"
            disabled={!matches}
            className="flex items-center gap-2 rounded-xl bg-clear-strong px-4 py-2 text-[13.5px] font-semibold text-white hover:brightness-110 disabled:bg-clear-soft disabled:text-clear/60"
          >
            <UserX size={17} strokeWidth={2} />
            Delete account
          </button>
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
            {summaries} summaries with their sources and figures
          </li>
          <li className="flex items-center gap-2.5">
            <Monitor size={15} strokeWidth={2} className="text-clear" />
            {devices} signed-in {devices === 1 ? "device" : "devices"}, signed out at once
          </li>
        </ul>
      </div>

      <button type="button" className="flex w-full items-center gap-2.5 rounded-xl border border-input/30 bg-input-soft px-3.5 py-2.5 text-[13px] font-semibold text-input hover:border-input/60">
        <Download size={16} strokeWidth={2} />
        Export your data first
      </button>

      <Field
        icon={AtSign}
        label={`Type ${account.username} to confirm`}
        type="text"
        placeholder={account.username}
        value={confirm}
        onChange={setConfirm}
        autoComplete="off"
      />
    </Dialog>
  );
}
