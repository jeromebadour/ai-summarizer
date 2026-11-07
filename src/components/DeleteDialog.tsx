import { LoaderCircle, Trash2, X } from "lucide-react";
import { Dialog, keepButton } from "@/components/Dialog";
import { lengthStyles } from "@/components/LengthPicker";
import type { SummaryLength } from "@/lib/summary";

type DeleteDialogProps = {
  title: string;
  length: SummaryLength;
  savedAt: string;
  deleting: boolean;
};

export function DeleteDialog({ title, length, savedAt, deleting }: DeleteDialogProps) {
  const style = lengthStyles[length];
  const LengthIcon = style.icon;

  return (
    <Dialog
      tone="clear"
      icon={Trash2}
      title="Delete this summary?"
      detail="The summary, its source and its figures are removed for good. Your limits stay as they are."
      actions={
        <>
          <button type="button" disabled={deleting} className={keepButton}>
            <X size={17} strokeWidth={2} className="text-brand-strong" />
            Keep
          </button>
          <button
            type="button"
            disabled={deleting}
            className="flex items-center gap-2 rounded-xl bg-clear-strong px-4 py-2 text-[13.5px] font-semibold text-white hover:brightness-110 disabled:bg-clear-soft disabled:text-clear"
          >
            {deleting ? <LoaderCircle size={17} strokeWidth={2.2} className="animate-spin" /> : <Trash2 size={17} strokeWidth={2} />}
            {deleting ? "Deleting" : "Delete"}
          </button>
        </>
      }
    >
      <div className="flex items-center gap-3 rounded-xl border border-border bg-paper px-3.5 py-3">
        <span className={`grid size-8 shrink-0 place-items-center rounded-lg border ${style.on}`}>
          <LengthIcon size={15} strokeWidth={2.2} />
        </span>
        <span className="min-w-0">
          <span className="line-clamp-2 block text-[13.5px] font-semibold leading-snug">{title}</span>
          <span className="font-mono text-[11px] text-muted">{savedAt}</span>
        </span>
      </div>
    </Dialog>
  );
}
