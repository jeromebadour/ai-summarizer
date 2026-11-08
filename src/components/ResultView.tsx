"use client";

import { useEffect, useMemo, useState } from "react";
import { bare, typingIn } from "@/lib/keys";
import { SourcePanel } from "@/components/SourcePanel";
import { SourceCard } from "@/components/SourceCard";
import { SummaryPanel } from "@/components/SummaryPanel";
import { savePreference } from "@/app/actions/account";
import { usePhone } from "@/lib/use-phone";
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
  /** The viewer's saved layout: Split (source beside the summary, the default) or Column (one column with quotes). */
  view: "split" | "column";
  /** The server's guess that this is a phone (the `vw` cookie). On a phone the result is always the column: there is
   *  no room for two panes, so the switch is hidden there. */
  phone?: boolean;
};

export function ResultView({ sentences, summary, charLimit, initialFocus, variant, savedAt, openHref, deleteHref, onPaste, onClear, links: savedLinks, view: savedView, phone: phoneGuess = false }: ResultViewProps) {
  const phone = usePhone(phoneGuess);
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
  const [view, setView] = useState(savedView);
  const changeView = (next: "split" | "column") => {
    const before = view;
    setView(next);
    setReading(false);
    void savePreference("result_view", next)
      .then((r) => r.ok || setView(before))
      .catch(() => setView(before));
  };
  // Column view: the source stays folded to its card until Read it.
  const [reading, setReading] = useState(false);
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

  const summaryPanel = (
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
      view={phone ? { mode: "column", onChange: changeView, fixed: true } : { mode: view, onChange: changeView }}
    />
  );

  if (phone || view === "column") {
    return (
      <div data-result-column className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable_both-edges] max-md:overflow-visible max-md:[scrollbar-gutter:auto]">
        <div className="mx-auto max-w-[820px] space-y-4 pb-10 max-md:space-y-3 max-md:pb-2">
          {reading ? (
            <div className="flex max-h-[min(56vh,520px)] [&>section]:flex-1">
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
                onCollapse={() => setReading(false)}
              />
            </div>
          ) : (
            <SourceCard
              sentences={sentences}
              points={summary.points}
              litSentenceIds={litSentenceIds}
              words={wordsIn}
              readOnly={variant === "saved"}
              onFocus={setFocus}
              onOpen={() => setReading(true)}
              onPaste={onPaste}
              onClear={onClear}
            />
          )}
          {summaryPanel}
        </div>
      </div>
    );
  }

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
      {summaryPanel}
      <ThreadLayer sources={threads} />
    </div>
  );
}
