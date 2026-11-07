"use client";

import { FlaskConical, RotateCcw } from "lucide-react";
import Link from "next/link";
import { ErrorScreen } from "@/components/ErrorScreen";

export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : undefined;

  return (
    <ErrorScreen
      title="Something broke on our side"
      detail="The page hit an error while loading. Your saved summaries are safe. Try again, or go back to Distill."
      code={digest ? `ref ${digest}` : undefined}
      actions={
        <>
          <button type="button" onClick={retry} className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-[13.5px] font-semibold text-on-brand hover:brightness-110">
            <RotateCcw size={16} strokeWidth={2.2} />
            Try again
          </button>
          <Link href="/" className="flex items-center gap-2 rounded-xl border border-brand-line px-4 py-2 text-[13.5px] font-semibold text-text hover:bg-brand-soft">
            <FlaskConical size={16} strokeWidth={2} className="text-brand-strong" />
            Distill
          </Link>
        </>
      }
    />
  );
}
