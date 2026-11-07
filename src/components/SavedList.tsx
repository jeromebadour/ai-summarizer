import { ArrowDownWideNarrow, ChevronRight, Search, ShieldCheck, TriangleExclamationPoint } from "lucide-react";
import { ScrollArea } from "@/components/ScrollArea";
import Link from "next/link";
import { lengthStyles } from "@/components/LengthPicker";
import { Pager } from "@/components/Pager";
import { RowNumber, RowNumberHead } from "@/components/RowNumber";
import type { Page } from "@/lib/paging";
import type { FigureStatus, SavedItem, SummaryLength } from "@/lib/summary";

type SavedListProps = {
  items: SavedItem[];
  page: Page;
  query: string;
  lengths: SummaryLength[];
  flaggedOnly: boolean;
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

function Toolbar({ query, lengths, flaggedOnly }: Omit<SavedListProps, "items" | "page">) {
  return (
    <div className="flex items-center gap-3">
      <label className="flex w-[420px] items-center gap-2.5 rounded-xl border border-border-strong bg-paper px-3.5 py-2.5 focus-within:border-brand-line">
        <Search size={17} strokeWidth={2} className="text-brand-strong" />
        <input
          defaultValue={query}
          placeholder="Search titles, summaries and sources"
          className="min-w-0 flex-1 bg-transparent text-[13.5px] text-text outline-none placeholder:text-faint"
        />
      </label>
      <div className="flex gap-1.5">
        {(Object.keys(lengthStyles) as SummaryLength[]).map((key) => {
          const { icon: Icon, label, on, off } = lengthStyles[key];
          const selected = lengths.includes(key);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={selected}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[12.5px] font-semibold ${selected ? on : `border-border ${off}`}`}
            >
              <Icon size={15} strokeWidth={2.1} />
              {label}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={flaggedOnly}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[12.5px] font-semibold ${
            flaggedOnly ? "border-flag bg-flag-soft text-flag" : "border-border text-flag/80 hover:bg-flag-soft"
          }`}
        >
          <TriangleExclamationPoint size={15} strokeWidth={2.1} />
          Flagged
        </button>
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
  const ratio = item.wordsOut / item.wordsIn;

  return (
    <li>
      <Link
        href={`/saved/${item.id}`}
        className="group grid grid-cols-[24px_44px_minmax(0,1fr)_230px_150px_96px_110px_20px] items-center gap-5 rounded-xl border border-transparent px-4 py-3.5 transition-colors hover:border-brand-line hover:bg-brand-soft"
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

export function SavedList({ items, page, query, lengths, flaggedOnly }: SavedListProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 rounded-2xl border border-border bg-panel p-5">
      <Toolbar query={query} lengths={lengths} flaggedOnly={flaggedOnly} />
      <div className="grid grid-cols-[24px_44px_minmax(0,1fr)_230px_150px_96px_110px_20px] gap-5 border-b border-border px-4 pb-2.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-faint">
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
      <Pager page={page} noun="summaries" href={(n) => (n === 1 ? "/saved" : `/saved?page=${n}`)} />
    </section>
  );
}
