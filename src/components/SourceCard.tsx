"use client";

import { BookOpen, ClipboardPaste, Eraser, FileText } from "@/components/glyphs";
import { Coverage } from "@/components/SourcePanel";
import type { Focus, SourceSentence, SummaryPoint } from "@/lib/summary";

/**
 * Column view: the source folded to a card above the summary. It keeps the coverage strip (which lights as points are
 * hovered) and the source tools; Read it opens the full text with the used sentences marked.
 */
export function SourceCard({
  sentences,
  points,
  litSentenceIds,
  words,
  readOnly,
  onFocus,
  onOpen,
  onPaste,
  onClear,
}: {
  sentences: SourceSentence[];
  points: SummaryPoint[];
  litSentenceIds: number[];
  words: number;
  readOnly: boolean;
  onFocus?: (focus: Focus) => void;
  onOpen: () => void;
  onPaste?: () => void;
  onClear?: () => void;
}) {
  return (
    <section data-source-card className="rounded-2xl border border-border/70 bg-paper shadow-[var(--shadow-paper)]">
      <header className="flex items-center gap-2.5 px-5 pb-3 pt-4 max-md:flex-wrap max-md:px-4">
        <FileText size={15} strokeWidth={1.9} className="text-muted" />
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">Source</h2>
        <span className="font-mono text-[11px] text-faint">
          {words.toLocaleString("en-US")} words · {sentences.length} sentences
        </span>
        <div className="ml-auto flex gap-1.5 max-md:ml-0 max-md:w-full">
          <button
            type="button"
            onClick={onOpen}
            className="flex items-center gap-1.5 rounded-lg border border-border-strong px-2.5 py-1 text-[12px] font-semibold text-text hover:bg-panel-raised"
          >
            <BookOpen size={14} strokeWidth={2} />
            Read it
          </button>
          {!readOnly && (
            <>
              <button
                type="button"
                onClick={onPaste}
                className="flex items-center gap-1.5 rounded-lg border border-input/30 bg-input-soft px-2.5 py-1 text-[12px] font-semibold text-input hover:border-input/60"
              >
                <ClipboardPaste size={14} strokeWidth={2} />
                Paste
              </button>
              <button
                type="button"
                onClick={onClear}
                className="flex items-center gap-1.5 rounded-lg border border-clear/30 bg-clear-soft px-2.5 py-1 text-[12px] font-semibold text-clear hover:border-clear/60"
              >
                <Eraser size={14} strokeWidth={2} />
                Clear
              </button>
            </>
          )}
        </div>
      </header>
      <Coverage sentences={sentences} points={points} litSentenceIds={litSentenceIds} onFocus={onFocus} />
    </section>
  );
}
