import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "@/components/NavLink";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DeleteDialog } from "@/components/DeleteDialog";
import { LoadingScreen } from "@/components/LoadingScreen";
import { QuotaRing } from "@/components/QuotaRing";
import { Rail } from "@/components/Rail";
import { ResultView } from "@/components/ResultView";
import { StatusPill, type AppStatus } from "@/components/StatusPill";
import { requireAccount } from "@/lib/server/account";
import { getSaved } from "@/lib/server/library";
import { loadWorkspace } from "@/lib/server/workspace";
import { partsIn, viewerZone } from "@/lib/server/zone";

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
  const { user, account } = await requireAccount();
  const { id } = await params;
  const { dialog, done } = await searchParams;
  // Read as the user: someone else's summary isn't there at all, so it is the same 404 as one that never existed.
  const [saved, { quota }] = await Promise.all([getSaved(user, id), loadWorkspace(user)]);
  if (!saved) notFound();
  const status: AppStatus = done === "deleted" ? { kind: "saved", label: "Deleted", at: partsIn(new Date(), await viewerZone()).time } : { kind: "ready" };
  const here = `/saved/${saved.id}`;

  return (
    <div className="flex h-screen">
      <Rail page="saved" account={account} />
      <main className="flex min-w-0 flex-1 flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          <Link
            href="/saved"
            className="flex items-center gap-2 rounded-xl border border-brand-line px-3.5 py-2 text-[13.5px] font-semibold text-text hover:bg-brand-soft"
          >
            <ArrowLeft size={18} strokeWidth={2} className="text-brand-strong" />
            Saved
          </Link>
          <span className="font-mono text-[12px] text-muted">
            {saved.position} of {saved.total}
          </span>
          <StepLink href={saved.newerId ? `/saved/${saved.newerId}` : null} label="Newer" icon={ChevronLeft} />
          <StepLink href={saved.olderId ? `/saved/${saved.olderId}` : null} label="Older" icon={ChevronRight} />
          <StatusPill status={status} />
          <div className="ml-auto">
            <QuotaRing {...quota} />
          </div>
        </div>
        <ResultView
          sentences={saved.sentences}
          summary={saved.summary}
          charLimit={20000}
          initialFocus={null}
          variant="saved"
          savedAt={saved.savedAt}
          deleteHref={`${here}?dialog=delete`}
          links={user.links}
        />
      </main>
      {dialog === "delete" && (
        <DeleteDialog
          id={saved.id}
          title={saved.summary.title}
          length={saved.summary.length}
          savedAt={saved.savedAt}
          closeHref={here}
          nextId={saved.olderId ?? saved.newerId}
        />
      )}
    </div>
  );
}
