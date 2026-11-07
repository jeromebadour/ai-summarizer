import { FlaskConical, Library, SearchX } from "lucide-react";
import Link from "next/link";
import { ErrorScreen } from "@/components/ErrorScreen";

export default function NotFound() {
  return (
    <ErrorScreen
      icon={SearchX}
      title="Nothing here"
      detail="This page or summary doesn't exist, or it was deleted."
      code="404"
      actions={
        <>
          <Link href="/saved" className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-[13.5px] font-semibold text-on-brand hover:brightness-110">
            <Library size={16} strokeWidth={2} />
            Saved
          </Link>
          <Link href="/" className="flex items-center gap-2 rounded-xl border border-brand-line px-4 py-2 text-[13.5px] font-semibold text-text hover:bg-brand-soft">
            <FlaskConical size={16} strokeWidth={2} className="text-brand-strong" />
            Distill
          </Link>
        </>
      }
    />
  );
}
