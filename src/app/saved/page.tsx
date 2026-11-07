import { Library } from "lucide-react";
import { Suspense } from "react";
import { EmptyLibrary } from "@/components/EmptyLibrary";
import { LoadingScreen } from "@/components/LoadingScreen";
import { QuotaRing } from "@/components/QuotaRing";
import { Rail } from "@/components/Rail";
import { SavedList } from "@/components/SavedList";
import { StatusPill } from "@/components/StatusPill";
import { pageOf, pageSizes } from "@/lib/paging";
import { sampleLongLibrary } from "@/lib/sample";

export default function SavedPage({ searchParams }: PageProps<"/saved">) {
  return (
    <Suspense fallback={<LoadingScreen label="Loading your saved summaries" />}>
      <Saved searchParams={searchParams} />
    </Suspense>
  );
}

async function Saved({ searchParams }: Pick<PageProps<"/saved">, "searchParams">) {
  const params = await searchParams;
  // Sample data stands in for the database here: the real query reads only this page (LIMIT / OFFSET) and a count.
  const all = params.empty === "1" ? [] : sampleLongLibrary;
  const page = pageOf(params.page, all.length, pageSizes.saved);
  const items = all.slice(page.offset, page.offset + page.size);
  return (
    <div className="flex h-screen">
      <Rail page="saved" />
      <main className="flex min-w-0 flex-1 flex-col gap-5 p-6">
        <div className="flex items-center gap-4">
          <Library size={22} strokeWidth={1.9} className="text-brand-strong" />
          <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Saved</h1>
          {items.length > 0 && (
            <span className="rounded-md border border-brand-line bg-brand-soft px-2 py-0.5 font-mono text-[12px] font-semibold text-brand-strong">
              {page.total}
            </span>
          )}
          <StatusPill status={{ kind: "ready" }} />
          <div className="ml-auto">
            <QuotaRing used={items.length > 0 ? 1 : 0} limit={10} resetsAt="12:52" dayUsed={items.length > 0 ? 2 : 0} dayLimit={30} />
          </div>
        </div>
        {items.length > 0 ? <SavedList items={items} page={page} query="" lengths={[]} flaggedOnly={false} /> : <EmptyLibrary />}
      </main>
    </div>
  );
}
