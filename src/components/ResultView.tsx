"use client";

import { useMemo, useState } from "react";
import { SourcePanel } from "@/components/SourcePanel";
import { SummaryPanel } from "@/components/SummaryPanel";
import { ThreadLayer } from "@/components/ThreadLayer";
import { countWords, focusedPointId, focusedSentenceIds, type Focus, type SourceSentence, type Summary } from "@/lib/summary";

type ResultViewProps = {
  sentences: SourceSentence[];
  summary: Summary;
  charLimit: number;
  initialFocus: Focus;
  variant: "result" | "saved";
  savedAt?: string;
  onCopy?: () => void;
  copied?: boolean;
  openHref?: string;
  onPaste?: () => void;
  onClear?: () => void;
};

export function ResultView({ sentences, summary, charLimit, initialFocus, variant, savedAt, onCopy, copied, openHref, onPaste, onClear }: ResultViewProps) {
  const [focus, setFocus] = useState<Focus>(initialFocus);

  const source = sentences.map((s) => s.text).join(" ");
  const wordsIn = countWords(source);
  const wordsOut = countWords(summary.points.map((p) => p.text).join(" "));
  const litSentenceIds = useMemo(() => focusedSentenceIds(focus, summary), [focus, summary]);
  const pointId = focusedPointId(focus, summary.points);
  const origin = focus?.kind === "figure" ? `[data-figure="${focus.id}"]` : pointId !== null ? `[data-point="${pointId}"]` : null;

  return (
    <div className="relative grid min-h-0 flex-1 grid-cols-[0.8fr_1.2fr] gap-6">
      <SourcePanel
        sentences={sentences}
        points={summary.points}
        litSentenceIds={litSentenceIds}
        charCount={source.length}
        charLimit={charLimit}
        locked={false}
        readOnly={variant === "saved"}
        onFocus={setFocus}
        onPaste={onPaste}
        onClear={onClear}
      />
      <SummaryPanel
        state="done"
        variant={variant}
        savedAt={savedAt}
        summary={summary}
        sentences={sentences}
        focusPointId={pointId}
        focusFigureId={focus?.kind === "figure" ? focus.id : null}
        wordsIn={wordsIn}
        wordsOut={wordsOut}
        onFocus={setFocus}
        onCopy={onCopy}
        copied={copied}
        openHref={openHref}
      />
      <ThreadLayer origin={origin} sentenceIds={litSentenceIds} />
    </div>
  );
}
