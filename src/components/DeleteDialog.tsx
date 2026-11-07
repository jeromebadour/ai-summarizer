"use client";

import { Trash2, X } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { deleteSummary } from "@/app/actions/library";
import { Dialog, keepButton } from "@/components/Dialog";
import { FormAlert } from "@/components/FormAlert";
import { lengthStyles } from "@/components/LengthPicker";
import { PendingButton } from "@/components/PendingButton";
import type { FormState } from "@/lib/server/rules";
import type { SummaryLength } from "@/lib/summary";

type DeleteDialogProps = {
  id: string;
  title: string;
  length: SummaryLength;
  savedAt: string;
  /** Where Keep goes (this summary's page). */
  closeHref: string;
  /** The summary to show after deleting (older, else newer), or null for the library. */
  nextId: string | null;
};

export function DeleteDialog({ id, title, length, savedAt, closeHref, nextId }: DeleteDialogProps) {
  const [state, action] = useActionState<FormState, FormData>(deleteSummary, undefined);
  const style = lengthStyles[length];
  const LengthIcon = style.icon;

  return (
    <Dialog
      tone="clear"
      icon={Trash2}
      title="Delete this summary?"
      detail="The summary, its source and its figures are removed for good. Your limits stay as they are."
      formAction={action}
      actions={
        <>
          <Link href={closeHref} className={keepButton}>
            <X size={17} strokeWidth={2} className="text-brand-strong" />
            Keep
          </Link>
          <PendingButton
            icon={<Trash2 size={17} strokeWidth={2} />}
            label="Delete"
            pendingLabel="Deleting"
            className="flex items-center gap-2 rounded-xl bg-clear-strong px-4 py-2 text-[13.5px] font-semibold text-white hover:brightness-110 disabled:bg-clear-soft disabled:text-clear"
          />
        </>
      }
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="next" value={nextId ?? ""} />
      <div className="flex items-center gap-3 rounded-xl border border-border bg-paper px-3.5 py-3">
        <span className={`grid size-8 shrink-0 place-items-center rounded-lg border ${style.on}`}>
          <LengthIcon size={15} strokeWidth={2.2} />
        </span>
        <span className="min-w-0">
          <span className="line-clamp-2 block text-[13.5px] font-semibold leading-snug">{title}</span>
          <span className="font-mono text-[11px] text-muted">{savedAt}</span>
        </span>
      </div>
      {state?.error && <FormAlert message={state.error} />}
    </Dialog>
  );
}
