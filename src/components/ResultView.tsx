"use client";

import { useEffect, useMemo, useState } from "react";
import { bare, typingIn } from "@/lib/keys";
import { SourcePanel } from "@/components/SourcePanel";
import { SummaryPanel } from "@/components/SummaryPanel";
import { savePreference } from "@/app/actions/account";
import { ThreadLayer, type ThreadSource } from "@/components/ThreadLayer";
import { countWords, focusedPointId, focusedSentenceIds, type Focus, type SourceSentence, type Summary } from "@/lib/summary";

type ResultViewProps = {
  sentences: SourceSentence[];
  summary: Summary;
  charLimit: number;
  initialFocus: Focus;
  variant: "result" | "saved";
  savedAt?: string;
  openHref?: string;
  /** Saved variant: where Delete goes (the page with its dialog open). */
  deleteHref?: string;
  onPaste?: () => void;
  onClear?: () => void;
  /** The viewer's saved choice: every point's links drawn at once (the default), or only on hover. */
  links: "always" | "hover";
};

export function ResultView({ sentences, summary, charLimit, initialFocus, variant, savedAt, openHref, deleteHref, onPaste, onClear, links: savedLinks }: ResultViewProps) {
  const [focus, setFocus] = useState<Focus>(initialFocus);
  const [links, setLinks] = useState(savedLinks);
  // Switches at once and saves to the account; if the save fails, it switches back.
  const toggleLinks = () => {
    const next = links === "always" ? "hover" : "always";
    setLinks(next);
    void savePreference("links", next)
      .then((r) => r.ok || setLinks(links))
      .catch(() => setLinks(links));
  };
  const [copied, setCopied] = useState(false);

  // Copy as plain text: the title, then one line per point. "Copied" shows for 2 s.
  const copy = async () => {
    await navigator.clipboard.writeText(`${summary.title}\n\n${summary.points.map((p) => `- ${p.text}`).join("\n")}\n`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Shortcuts (listed on Preferences): C copies, 1 to 9 focus that point. Never while typing in a field.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (typingIn(event) || !bare(event)) return;
      if (event.key === "c" || event.key === "C") {
        event.preventDefault();
        void copy();
      } else if (/^[1-9]$/.test(event.key) && summary.points.some((p) => p.id === Number(event.key))) {
        event.preventDefault();
        setFocus({ kind: "point", id: Number(event.key) });
        document.querySelector(`[data-point="${event.key}"]`)?.scrollIntoView({ block: "nearest" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const source = sentences.map((s) => s.text).join(" ");
  const wordsIn = countWords(source);
  const wordsOut = countWords(summary.points.map((p) => p.text).join(" "));
  const litSentenceIds = useMemo(() => focusedSentenceIds(focus, summary), [focus, summary]);
  const pointId = focusedPointId(focus, summary.points);
  const origin = focus?.kind === "figure" ? `[data-figure="${focus.id}"]` : pointId !== null ? `[data-point="${pointId}"]` : null;
  const threads: ThreadSource[] = [
    ...(links === "always"
      ? summary.points.filter((p) => `[data-point="${p.id}"]` !== origin).map((p) => ({ origin: `[data-point="${p.id}"]`, sentenceIds: p.sourceIds, strong: false }))
      : []),
    ...(origin ? [{ origin, sentenceIds: litSentenceIds, strong: true }] : []),
  ];

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
        onCopy={copy}
        copied={copied}
        openHref={openHref}
        deleteHref={deleteHref}
        links={{ mode: links, onToggle: toggleLinks }}
      />
      <ThreadLayer sources={threads} />
    </div>
  );
}
