import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { QuotaRing } from "@/components/QuotaRing";
import { Rail } from "@/components/Rail";
import { DeleteDialog } from "@/components/DeleteDialog";
import { ResultView } from "@/components/ResultView";
import { StatusPill } from "@/components/StatusPill";
import { sampleLibrary, sampleSentences, sampleSummary } from "@/lib/sample";
import { requireAccount } from "@/lib/server/account";

export default function SavedSummaryPage({ params, searchParams }: PageProps<"/saved/[id]">) {
  return (
    <Suspense fallback={<LoadingScreen label="Opening summary" />}>
      <SavedSummary params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function StepLink({ href, label, icon: Icon }: { href: string | null; label: string; icon: typeof ChevronLeft }) {
  if (!href) return null;
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-lg border border-border-strong px-2.5 py-1.5 text-[12.5px] font-semibold text-muted hover:border-brand-line hover:text-text"
    >
      <Icon size={16} strokeWidth={2} />
      {label}
    </Link>
  );
}

async function SavedSummary({ params, searchParams }: Pick<PageProps<"/saved/[id]">, "params" | "searchParams">) {
  const { account } = await requireAccount();
  const { id } = await params;
  const { dialog } = await searchParams;
  const index = sampleLibrary.findIndex((item) => item.id === id);
  if (index === -1) notFound();
  const item = sampleLibrary[index];
  const newer = sampleLibrary[index - 1];
  const older = sampleLibrary[index + 1];

  return (
    <div className="flex h-screen">
      <Rail page="saved" account={account} />
      <main className="flex min-w-0 flex-1 flex-col gap-5 p-6">
        <div className="flex items-center gap-3">
          <Link
            href="/saved"
            className="flex items-center gap-2 rounded-xl border border-brand-line px-3.5 py-2 text-[13.5px] font-semibold text-text hover:bg-brand-soft"
          >
            <ArrowLeft size={18} strokeWidth={2} className="text-brand-strong" />
            Saved
          </Link>
          <span className="font-mono text-[12px] text-muted">
            {index + 1} of {sampleLibrary.length}
          </span>
          <StepLink href={newer ? `/saved/${newer.id}` : null} label="Newer" icon={ChevronLeft} />
          <StepLink href={older ? `/saved/${older.id}` : null} label="Older" icon={ChevronRight} />
          <StatusPill status={{ kind: "ready" }} />
          <div className="ml-auto">
            <QuotaRing used={1} limit={10} resetsAt="12:52" dayUsed={2} dayLimit={30} />
          </div>
        </div>
        <ResultView
          sentences={sampleSentences}
          summary={sampleSummary}
          charLimit={20000}
          initialFocus={{ kind: "point", id: 2 }}
          variant="saved"
          savedAt={item.createdAt}
        />
      </main>
      {(dialog === "delete" || dialog === "deleting") && (
        <DeleteDialog title={item.title} length={item.length} savedAt={item.createdAt} deleting={dialog === "deleting"} />
      )}
    </div>
  );
}
