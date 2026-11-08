"use client";

import { ClipboardPaste, Eraser, FileText, FlaskConical, Link2, Ruler, ShieldCheck, WandSparkles } from "lucide-react";
import { useEffect, useRef } from "react";
import { MIN_SOURCE_WORDS } from "@/lib/distill";

/**
 * Before Distill: one calm thing on screen, the text going in. Centred, with its own Paste, Sample, Clear, the word
 * count, and Distill next to its Ctrl ↵ (the same action as the toolbar's). There is no summary side yet, so none is
 * drawn. Pressing Distill opens this into the split (the source slides left, the summary rises in on the right).
 */
export function Composer({
  text,
  words,
  charLimit,
  canRun,
  short,
  blocked,
  onChange,
  onPaste,
  onClear,
  onSample,
  onDistill,
}: {
  text: string;
  words: number;
  charLimit: number;
  canRun: boolean;
  /** Some text, but under the minimum: said calmly in the composer, with how far off it is. */
  short: boolean;
  /** A limit or stop is in force (its strip says why above); the composer still takes text. */
  blocked: boolean;
  onChange: (text: string) => void;
  onPaste: () => void;
  onClear: () => void;
  onSample: () => void;
  onDistill: () => void;
}) {
  const empty = text.trim() === "";
  const over = text.length > charLimit;
  const area = useRef<HTMLTextAreaElement>(null);
  useEffect(() => area.current?.focus(), []);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-2">
      <div className="flex max-h-full w-full max-w-[780px] flex-col">
        {empty && (
          <div className="mb-6 text-center">
            <h1 className="text-[32px] font-semibold tracking-[-0.025em] max-md:text-[26px]">
              What should we <span className="text-brand-strong">distill</span>?
            </h1>
            <p className="mt-2 text-[15px] text-muted max-md:text-[14px]">A short summary you can check: every point traced to its sentences, every number verified.</p>
          </div>
        )}

        <div
          data-composer
          className={`relative flex min-h-0 flex-col rounded-[22px] border bg-panel shadow-[0_30px_90px_-40px_var(--glow),0_0_0_1px_rgba(255,255,255,0.02)] transition-colors ${
            empty ? "border-border-strong" : "border-brand-line"
          }`}
        >
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-brand-strong/60 to-transparent" aria-hidden />
          <textarea
            ref={area}
            aria-label="Source text"
            value={text}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Paste an article, a report or notes. Every point will link back to its sentences."
            spellCheck={false}
            // Grows with the text, from a few lines up to about half the window; then it scrolls.
            className="max-h-[min(46vh,440px)] min-h-[132px] resize-none bg-transparent px-6 pt-5 pb-3 max-md:px-4 max-md:pt-4 text-[15px] font-[450] leading-[1.7] text-text outline-none [field-sizing:content] placeholder:text-faint"
          />
          <div className="flex items-center gap-2 border-t border-border/70 px-3 py-2.5 max-md:flex-wrap">
            <button
              type="button"
              onClick={onPaste}
              className="flex items-center gap-1.5 rounded-lg border border-input/35 bg-input-soft px-2.5 py-1 text-[12.5px] font-semibold text-input hover:border-input/70"
            >
              <ClipboardPaste size={14} strokeWidth={2.1} />
              Paste
            </button>
            {empty ? (
              <button
                type="button"
                onClick={onSample}
                className="flex items-center gap-1.5 rounded-lg border border-brand-line px-2.5 py-1 text-[12.5px] font-semibold text-brand-strong hover:bg-brand-soft"
              >
                <WandSparkles size={14} strokeWidth={2.1} />
                Sample
              </button>
            ) : (
              <button
                type="button"
                onClick={onClear}
                className="flex items-center gap-1.5 rounded-lg border border-clear/30 bg-clear-soft px-2.5 py-1 text-[12.5px] font-semibold text-clear hover:border-clear/60"
              >
                <Eraser size={14} strokeWidth={2.1} />
                Clear
              </button>
            )}

            {/* Under the minimum: a calm normal state, how far off, nothing counted. */}
            {/* Over the limit wins over too short (the server checks in the same order). */}
            {short && !over ? (
              <span role="status" className="ml-auto flex items-center gap-2 text-[12.5px] font-semibold text-brand-strong max-md:order-1 max-md:w-full max-md:flex-wrap max-md:pl-1">
                <Ruler size={14} strokeWidth={2.1} />
                Too short to distill
                <span className="h-1.5 w-20 overflow-hidden rounded-full bg-border/70" aria-hidden>
                  <span className="block h-full rounded-full bg-brand-strong" style={{ width: `${Math.round((words / MIN_SOURCE_WORDS) * 100)}%` }} />
                </span>
                <span className="font-mono text-[11px] font-medium text-muted">
                  {words} of {MIN_SOURCE_WORDS} words
                </span>
              </span>
            ) : (
              <span className={`ml-auto font-mono text-[11px] ${over ? "font-semibold text-flag" : "text-faint"}`}>
                {empty ? `${MIN_SOURCE_WORDS} words or more` : `${words.toLocaleString("en-US")} ${words === 1 ? "word" : "words"} · ${text.length.toLocaleString("en-US")} / ${charLimit.toLocaleString("en-US")}`}
              </span>
            )}

            {!blocked && (
              <button
                type="button"
                data-tour="distill"
                onClick={onDistill}
                disabled={!canRun}
                className="flex items-center gap-2 rounded-xl bg-brand py-2 pl-3.5 pr-2 text-[13.5px] font-semibold text-on-brand max-md:order-2 max-md:w-full max-md:justify-center max-md:py-2.5 max-md:text-[14.5px] shadow-[0_6px_24px_-8px_var(--brand)] hover:brightness-110 disabled:bg-brand-soft disabled:text-brand-strong disabled:shadow-none"
              >
                <FlaskConical size={15} strokeWidth={2.2} />
                Distill
                <kbd className="rounded-md border border-white/15 bg-black/15 px-1.5 py-0.5 font-mono text-[10px] font-medium opacity-80 max-md:hidden">Ctrl ↵</kbd>
              </button>
            )}
          </div>
        </div>

        {empty && (
          <div className="mt-5 flex justify-center gap-6 text-[12.5px] text-muted max-md:flex-wrap max-md:gap-x-4 max-md:gap-y-2">
            <span className="flex items-center gap-2">
              <Link2 size={14} strokeWidth={2} className="text-brand-strong" />
              Linked to the source
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck size={14} strokeWidth={2} className="text-verify" />
              Figures checked
            </span>
            <span className="flex items-center gap-2">
              <FileText size={14} strokeWidth={2} className="text-input" />
              Saved to your library
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
