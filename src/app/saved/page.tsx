import { Library } from "lucide-react";
import { Suspense } from "react";
import { EmptyLibrary } from "@/components/EmptyLibrary";
import { LoadingScreen } from "@/components/LoadingScreen";
import { QuotaRing } from "@/components/QuotaRing";
import { Rail } from "@/components/Rail";
import { SavedList } from "@/components/SavedList";
import { StatusPill, type AppStatus } from "@/components/StatusPill";
import { isFiltered } from "@/lib/library-url";
import { requireAccount } from "@/lib/server/account";
import { filterFrom, listLibrary } from "@/lib/server/library";
import { loadWorkspace } from "@/lib/server/workspace";
import { partsIn, viewerZone } from "@/lib/server/zone";

export default function SavedPage({ searchParams }: PageProps<"/saved">) {
  return (
    <Suspense fallback={<LoadingScreen label="Loading your saved summaries" />}>
      <Saved searchParams={searchParams} />
    </Suspense>
  );
}

async function Saved({ searchParams }: Pick<PageProps<"/saved">, "searchParams">) {
  const { user, account } = await requireAccount();
  const params = await searchParams;
  const filter = filterFrom(params);
  // The database filters, counts and reads one page of 7; nothing else reaches the browser.
  const [{ items, page }, { quota }] = await Promise.all([listLibrary(user, filter, params.page), loadWorkspace(user)]);
  const status: AppStatus = params.done === "deleted" ? { kind: "saved", label: "Deleted", at: partsIn(new Date(), await viewerZone()).time } : { kind: "ready" };
  const emptyLibrary = page.total === 0 && !isFiltered(filter);

  return (
    <div className="flex h-screen">
      <Rail page="saved" account={account} />
      <main className="flex min-w-0 flex-1 flex-col gap-4 p-5">
        <div className="flex items-center gap-4">
          <Library size={22} strokeWidth={1.9} className="text-brand-strong" />
          <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Saved</h1>
          {page.total > 0 && (
            <span className="rounded-md border border-brand-line bg-brand-soft px-2 py-0.5 font-mono text-[12px] font-semibold text-brand-strong">
              {page.total}
            </span>
          )}
          <StatusPill status={status} />
          <div className="ml-auto">
            <QuotaRing {...quota} />
          </div>
        </div>
        {/* An empty library has nothing to search: the invitation only. A filter with no match keeps its toolbar. */}
        {emptyLibrary ? <EmptyLibrary /> : <SavedList items={items} page={page} filter={filter} />}
      </main>
    </div>
  );
}
