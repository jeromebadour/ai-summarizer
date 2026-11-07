import { ArrowDownWideNarrow, ChevronRight, SearchX, ShieldCheck, TriangleExclamationPoint, X } from "lucide-react";
import { ScrollArea } from "@/components/ScrollArea";
import Link from "next/link";
import { lengthStyles } from "@/components/LengthPicker";
import { Pager } from "@/components/Pager";
import { RowNumber, RowNumberHead } from "@/components/RowNumber";
import { SavedSearch } from "@/components/SavedSearch";
import { savedHref, type LibraryFilterParams } from "@/lib/library-url";
import type { Page } from "@/lib/paging";
import type { FigureStatus, SavedItem, SummaryLength } from "@/lib/summary";

type SavedListProps = {
  items: SavedItem[];
  page: Page;
  filter: LibraryFilterParams;
};

function StatusMark({ status }: { status: FigureStatus }) {
  if (status === "checked") {
    return (
      <span className="flex items-center gap-1.5 text-[12px] font-semibold text-verify">
        <ShieldCheck size={15} strokeWidth={2} />
        Checked
      </span>
    );
  }
  if (status === "flagged") {
    return (
      <span className="flex items-center gap-1.5 text-[12px] font-semibold text-flag">
        <TriangleExclamationPoint size={15} strokeWidth={2} />
        Flagged
      </span>
    );
  }
  return null;
}

/** Each chip is a link to the same view with that filter switched (back to page 1), so filters have links too. */
function Toolbar({ filter }: { filter: LibraryFilterParams }) {
  const lengths = filter.lengths;
  return (
    <div className="flex items-center gap-3">
      <SavedSearch filter={filter} />
      <div className="flex gap-1.5">
        {(Object.keys(lengthStyles) as SummaryLength[]).map((key) => {
          const { icon: Icon, label, on, off } = lengthStyles[key];
          const selected = lengths.includes(key);
          const next = selected ? lengths.filter((l) => l !== key) : [...lengths, key];
          return (
            <Link
              key={key}
              href={savedHref({ ...filter, lengths: next })}
              aria-pressed={selected}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[12.5px] font-semibold ${selected ? on : `border-border ${off}`}`}
            >
              <Icon size={15} strokeWidth={2.1} />
              {label}
            </Link>
          );
        })}
        <Link
          href={savedHref({ ...filter, flagged: !filter.flagged })}
          aria-pressed={filter.flagged}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[12.5px] font-semibold ${
            filter.flagged ? "border-flag bg-flag-soft text-flag" : "border-border text-flag/80 hover:bg-flag-soft"
          }`}
        >
          <TriangleExclamationPoint size={15} strokeWidth={2.1} />
          Flagged
        </Link>
      </div>
      <span className="ml-auto flex items-center gap-1.5 font-mono text-[11.5px] text-muted">
        <ArrowDownWideNarrow size={14} strokeWidth={2} className="text-brand-strong" />
        Newest first
      </span>
    </div>
  );
}

function Row({ item, n }: { item: SavedItem; n: number }) {
  const length = lengthStyles[item.length];
  const LengthIcon = length.icon;
  const ratio = item.wordsIn > 0 ? item.wordsOut / item.wordsIn : 0;

  return (
    <li>
      <Link
        href={`/saved/${item.id}`}
        className="group grid grid-cols-[24px_44px_minmax(0,1fr)_230px_150px_96px_110px_20px] items-center gap-4 rounded-xl border border-transparent px-4 py-3.5 transition-colors hover:border-brand-line hover:bg-brand-soft"
      >
        <RowNumber n={n} />
        <span className={`grid size-11 place-items-center rounded-xl border ${length.on}`}>
          <LengthIcon size={19} strokeWidth={2.1} />
        </span>

        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold text-text">{item.title}</span>
          <span className="mt-1 block truncate text-[13px] text-muted">{item.preview}</span>
        </span>

        <span className="flex gap-1.5">
          {item.keyFigures.map((figure) => (
            <span key={figure} className="rounded-md border border-border bg-panel-raised/60 px-2 py-1 font-mono text-[12px] font-semibold text-figure">
              {figure}
            </span>
          ))}
        </span>

        <span>
          <span className="block h-1 rounded-full bg-border-strong" />
          <span className="mt-1 block h-1 rounded-full bg-brand" style={{ width: `${Math.max(ratio * 100, 3)}%` }} />
          <span className="mt-1.5 block font-mono text-[11px] text-brand-strong">{Math.round((1 - ratio) * 100)}% shorter</span>
        </span>

        <span>
          <StatusMark status={item.figureStatus} />
        </span>

        <span className="text-right font-mono text-[11.5px] text-muted">{item.createdAt}</span>

        <ChevronRight size={18} strokeWidth={2} className="text-faint transition-colors group-hover:text-brand-strong" />
      </Link>
    </li>
  );
}

export function SavedList({ items, page, filter }: SavedListProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 rounded-2xl border border-border bg-panel p-4">
      <Toolbar filter={filter} />
      {items.length === 0 ? (
        // A filter that matches nothing: say so, and offer the way back (the library itself isn't empty).
        <div role="status" className="grid flex-1 place-items-center">
          <div className="flex flex-col items-center text-center">
            <span className="grid size-14 place-items-center rounded-2xl border border-brand-line bg-brand-soft text-brand-strong">
              <SearchX size={24} strokeWidth={1.9} />
            </span>
            <h2 className="mt-4 text-[18px] font-semibold">Nothing matches</h2>
            <p className="mt-1 text-[13.5px] text-muted">
              {filter.q && filter.lengths.length === 0 && !filter.flagged ? (
                <>No saved summary matches &ldquo;{filter.q}&rdquo;.</>
              ) : filter.q ? (
                <>No saved summary matches &ldquo;{filter.q}&rdquo; with these filters.</>
              ) : (
                "No saved summary fits these filters."
              )}
            </p>
            <Link href="/saved" className="mt-5 flex items-center gap-2 rounded-xl border border-brand-line px-4 py-2 text-[13.5px] font-semibold text-text hover:bg-brand-soft">
              <X size={16} strokeWidth={2} className="text-brand-strong" />
              Clear filters
            </Link>
          </div>
        </div>
      ) : (
      <>
      <div className="grid grid-cols-[24px_44px_minmax(0,1fr)_230px_150px_96px_110px_20px] gap-4 border-b border-border px-4 pb-2.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-faint">
        <RowNumberHead />
        <span />
        <span>Summary</span>
        <span>Key figures</span>
        <span>Compression</span>
        <span>Figures</span>
        <span className="text-right">Saved</span>
        <span />
      </div>
      <ScrollArea as="ul" fade="panel" className="-mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto">
        {items.map((item, index) => (
          <Row key={item.id} item={item} n={page.offset + index + 1} />
        ))}
      </ScrollArea>
      <Pager page={page} noun="summaries" href={(n) => savedHref(filter, n)} />
      </>
      )}
    </section>
  );
}
