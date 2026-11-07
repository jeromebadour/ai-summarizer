"use client";

import { ClipboardPaste, Eraser, FileText, Sparkle } from "lucide-react";
import { ScrollArea } from "@/components/ScrollArea";
import { pointForSentence, type Focus, type SourceSentence, type SummaryPoint } from "@/lib/summary";

type SourcePanelProps = {
  sentences: SourceSentence[];
  points: SummaryPoint[];
  litSentenceIds: number[];
  charCount: number;
  charLimit: number;
  locked: boolean;
  readOnly?: boolean;
  /** Coverage only means something once the summary is finished. */
  finished?: boolean;
  onFocus?: (focus: Focus) => void;
  /** Editing: the source is a text area (before Distill, or after Clear / Paste). */
  edit?: { text: string; onChange: (text: string) => void };
  onPaste?: () => void;
  onClear?: () => void;
  /** Shown only while the text area is empty: loads the invented sample text. */
  onSample?: () => void;
};

function Coverage({ sentences, points, litSentenceIds, onFocus }: Pick<SourcePanelProps, "sentences" | "points" | "litSentenceIds" | "onFocus">) {
  const used = sentences.filter((s) => pointForSentence(points, s.id)).length;
  const skipped = sentences.length - used;

  return (
    <div className="px-5 pb-3">
      <div className="flex h-2 gap-[3px]" role="img" aria-label={`Summary covers ${used} of ${sentences.length} sentences`}>
        {sentences.map((sentence) => {
          const isUsed = pointForSentence(points, sentence.id) !== undefined;
          const lit = litSentenceIds.includes(sentence.id);
          return (
            <button
              key={sentence.id}
              type="button"
              aria-label={`Sentence ${sentence.id}${isUsed ? "" : ", skipped"}`}
              onMouseEnter={() => onFocus?.({ kind: "sentence", id: sentence.id })}
              className={`h-full rounded-sm transition-colors ${lit ? "bg-brand-strong" : isUsed ? "bg-brand" : "hatch"}`}
              style={{ flexGrow: sentence.text.length }}
            />
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-3 font-mono text-[11px]">
        <span className="flex items-center gap-1.5 text-brand-strong">
          <span className="size-2 rounded-sm bg-brand" />
          Covers {used} of {sentences.length}
        </span>
        {skipped > 0 && (
          <span className="flex items-center gap-1.5 text-muted">
            <span className="hatch size-2 rounded-sm" />
            {skipped} left out
          </span>
        )}
      </div>
    </div>
  );
}

export function SourcePanel({ sentences, points, litSentenceIds, charCount, charLimit, locked, readOnly = false, finished = true, onFocus, edit, onPaste, onClear, onSample }: SourcePanelProps) {
  const empty = edit !== undefined && edit.text.trim() === "";
  const over = charCount > charLimit;
  const paragraphs = Array.from(new Set(sentences.map((s) => s.paragraph)));

  return (
    <section data-source-panel className="flex min-h-0 flex-col rounded-2xl border border-border/70 bg-paper shadow-[var(--shadow-paper)]">
      <header className="flex items-center gap-2.5 px-5 pb-3 pt-4">
        <FileText size={15} strokeWidth={1.9} className="text-muted" />
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">Source</h2>
        {!readOnly && (
          <span className={`font-mono text-[11px] ${over ? "font-semibold text-flag" : "text-faint"}`}>
            {charCount.toLocaleString("en-US")} / {charLimit.toLocaleString("en-US")}
          </span>
        )}
        {!readOnly && (
        <div className="ml-auto flex gap-1.5">
          {empty && onSample && (
            <button
              type="button"
              onClick={onSample}
              className="flex items-center gap-1.5 rounded-lg border border-brand-line px-2.5 py-1 text-[12px] font-semibold text-brand-strong hover:bg-brand-soft"
            >
              <Sparkle size={14} strokeWidth={2} />
              Sample
            </button>
          )}
          <button
            type="button"
            disabled={locked}
            onClick={onPaste}
            className="flex items-center gap-1.5 rounded-lg border border-input/30 bg-input-soft px-2.5 py-1 text-[12px] font-semibold text-input hover:border-input/60 disabled:opacity-40"
          >
            <ClipboardPaste size={14} strokeWidth={2} />
            Paste
          </button>
          {!empty && (
            <button
              type="button"
              disabled={locked}
              onClick={onClear}
              className="flex items-center gap-1.5 rounded-lg border border-clear/30 bg-clear-soft px-2.5 py-1 text-[12px] font-semibold text-clear hover:border-clear/60 disabled:opacity-40"
            >
              <Eraser size={14} strokeWidth={2} />
              Clear
            </button>
          )}
        </div>
        )}
      </header>

      {edit ? (
        <textarea
          aria-label="Source text"
          value={edit.text}
          onChange={(event) => edit.onChange(event.target.value)}
          placeholder="Paste or type the text to summarize: an article, a report, notes. Up to 20,000 characters."
          spellCheck={false}
          className="min-h-0 flex-1 resize-none border-t border-border/60 bg-transparent pb-4 pl-5 pr-6 pt-3 text-[14.5px] font-[450] leading-[1.65] text-text outline-none placeholder:text-faint"
        />
      ) : (
      <>
      {finished && points.length > 0 && <Coverage sentences={sentences} points={points} litSentenceIds={litSentenceIds} onFocus={onFocus} />}

      <ScrollArea marker="source-scroll" fade="paper" className="min-h-0 flex-1 space-y-2.5 overflow-y-auto border-t border-border/60 pb-4 pl-5 pr-6 pt-3 text-[14.5px] font-[450] leading-[1.65]">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>
            {sentences
              .filter((s) => s.paragraph === paragraph)
              .map((sentence) => {
                const point = pointForSentence(points, sentence.id);
                const lit = litSentenceIds.includes(sentence.id);
                const style = lit
                  ? "bg-brand-mark text-text underline decoration-brand-strong decoration-2 underline-offset-4"
                  : point
                    ? "text-text underline decoration-faint decoration-dotted decoration-1 underline-offset-4"
                    : // Not used by the summary: quieter, never faded. Source text is always readable.
                      "text-muted";
                return (
                  <span key={sentence.id} onMouseEnter={() => onFocus?.({ kind: "sentence", id: sentence.id })}>
                    <span data-sentence={sentence.id} className={`rounded-[3px] box-decoration-clone px-0.5 transition-colors ${style}`}>
                      {sentence.text}
                    </span>
                    {point && (
                      <sup className={`ml-0.5 font-mono text-[9.5px] font-semibold ${lit ? "text-brand-strong" : "text-faint"}`}>{point.id}</sup>
                    )}{" "}
                  </span>
                );
              })}
          </p>
        ))}
      </ScrollArea>
      </>
      )}
    </section>
  );
}
