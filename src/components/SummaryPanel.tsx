"use client";

import { ArrowUpRight, Check, ClipboardCheck, ClipboardCopy, Coins, Columns2, Cpu, FlaskConical, Link2, LoaderCircle, MousePointer2, RotateCcw, Rows3, ServerCrash, ShieldCheck, Sparkles, Timer, Trash2, TriangleExclamationPoint, Waypoints } from "@/components/glyphs";
import { ScrollArea } from "@/components/ScrollArea";
import { DistillProgress } from "@/components/DistillProgress";
import { Drop, Reduction } from "@/components/still";
import { lengthStyles } from "@/components/LengthPicker";
import { checkFigures } from "@/lib/figures";
import {
  readingSeconds,
  type DistillFailure,
  type DistillRun,
  type Focus,
  type KeyFigure,
  type SourceSentence,
  type Summary,
  type SummaryLength,
  type SummaryPoint,
} from "@/lib/summary";

type DoneProps = {
  state: "done";
  variant: "result" | "saved";
  savedAt?: string;
  summary: Summary;
  sentences: SourceSentence[];
  focusPointId: number | null;
  focusFigureId: number | null;
  wordsIn: number;
  wordsOut: number;
  onFocus?: (focus: Focus) => void;
  /** Copy as text; `copied` shows the clipboard-check for 2 s after. */
  onCopy?: () => void;
  copied?: boolean;
  /** The saved summary's own page (result variant). */
  openHref?: string;
  /** Saved variant: opens the delete dialog. */
  deleteHref?: string;
  /** Links to the source: drawn for every point ("always") or only on hover. The switch sits next to Copy. */
  links?: { mode: "always" | "hover"; onToggle: () => void };
  /** Split (beside the source) or Column (one column, each point's sentences quoted under it). Also next to Copy. */
  view?: { mode: "split" | "column"; onChange: (mode: "split" | "column") => void; fixed?: boolean };
};

type RunningProps = { state: "running"; run: DistillRun; length: SummaryLength; wordsIn: number; onRetry?: () => void };

/** Before the first Distill: what the result will be, so the empty half of the screen still says something. */
type IdleProps = {
  state: "idle";
  length: SummaryLength;
  /** Off while a limit or stop blocks Distill. */
  hint: boolean;
  /** Set once there is text to distill: the card offers the Distill button right where the hint was. */
  onDistill?: () => void;
  /** Words so far, when there is some text but less than the minimum: the card says how far off it is. */
};

function sentenceTexts(sentences: SourceSentence[], ids: number[]): string[] {
  return sentences.filter((s) => ids.includes(s.id)).map((s) => s.text);
}

function CheckBadge({ point, sentences }: { point: SummaryPoint; sentences: SourceSentence[] }) {
  const check = checkFigures(point.text, sentenceTexts(sentences, point.sourceIds));
  if (check.status === "none") return null;
  if (check.status === "checked") {
    return (
      <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-md border border-verify/30 bg-verify-soft px-2 py-0.5 text-[11.5px] font-semibold text-verify">
        <ShieldCheck size={13} strokeWidth={2.2} />
        {check.count} {check.count === 1 ? "figure" : "figures"} checked
      </span>
    );
  }
  return (
    <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-md border border-flag/40 bg-flag-soft px-2 py-0.5 text-[11.5px] font-semibold text-flag">
      <TriangleExclamationPoint size={13} strokeWidth={2.2} />
      Not in source: {check.missing.join(", ")}
    </span>
  );
}

function PointRow({
  point,
  active,
  streaming = false,
  sentences,
  quotes = false,
  onFocus,
}: {
  point: SummaryPoint;
  active: boolean;
  streaming?: boolean;
  sentences?: SourceSentence[];
  /** Column view: the sentences this point came from, quoted under it (in place of the drawn links). */
  quotes?: boolean;
  onFocus?: (focus: Focus) => void;
}) {
  const quoted = quotes && sentences ? sentences.filter((s) => point.sourceIds.includes(s.id)) : [];
  return (
    <li
      data-point={point.id}
      onMouseEnter={() => onFocus?.({ kind: "point", id: point.id })}
      className={`flex gap-3 rounded-xl border px-4 py-2.5 transition-colors ${
        active ? "border-brand-line bg-brand-soft" : "border-transparent hover:bg-panel-raised"
      }`}
    >
      <Drop n={point.id} active={active} />
      <div className="min-w-0 flex-1">
        <p className={`text-[15px] leading-[1.6] text-text ${streaming ? "caret" : ""}`}>{point.text}</p>
        {sentences && <CheckBadge point={point} sentences={sentences} />}
        {quoted.length > 0 && (
          <ul className="mt-2.5 space-y-1.5" aria-label={`Sentences point ${point.id} came from`}>
            {quoted.map((sentence) => (
              <li
                key={sentence.id}
                data-quote={sentence.id}
                className={`flex gap-3 rounded-r-lg border-l-2 py-1.5 pl-3 pr-3 text-[13.5px] leading-[1.6] transition-colors ${
                  active ? "border-brand-strong bg-paper text-text" : "border-brand-line/70 bg-paper/50 text-muted"
                }`}
              >
                <span className="mt-[3px] shrink-0 font-mono text-[10.5px] font-semibold text-faint" title={`Sentence ${sentence.id} of your text`}>
                  S{sentence.id}
                </span>
                <span>{sentence.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

function FigureChip({ figure, sentences, active, onFocus }: { figure: KeyFigure; sentences: SourceSentence[]; active: boolean; onFocus?: (focus: Focus) => void }) {
  const check = checkFigures(figure.value, sentenceTexts(sentences, figure.sourceIds));
  const flagged = check.status === "unsupported";
  return (
    <li
      data-figure={figure.id}
      onMouseEnter={() => onFocus?.({ kind: "figure", id: figure.id })}
      className={`ampoule relative flex min-w-0 flex-col overflow-hidden rounded-2xl border py-1.5 pr-3 pl-[18px] transition-colors ${
        flagged
          ? "border-flag/40 bg-flag-soft"
          : active
            ? "border-brand-line bg-panel-raised"
            : "border-[var(--meniscus)]/50 bg-panel-raised hover:border-brand-line"
      }`}
    >
      <span className={`flex items-center gap-1.5 relative z-10 font-bold tracking-tight ${figure.value.length > 12 ? "text-[14px]" : "text-[17px]"} ${flagged ? "text-flag" : "text-text"}`}>
        {figure.value}
        {flagged ? <TriangleExclamationPoint size={13} strokeWidth={2.2} /> : <ShieldCheck size={13} strokeWidth={2.2} className="text-verify" />}
      </span>
      <span className="relative z-10 truncate text-[11.5px] font-medium text-muted">{figure.label}</span>
    </li>
  );
}

function FailureCard({ failure, onRetry }: { failure: DistillFailure; onRetry?: () => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-flag/35 bg-flag-soft/60">
      <div className="flex gap-4 p-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-flag/40 bg-flag-soft text-flag">
          <ServerCrash size={21} strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <h3 className="text-[16px] font-semibold text-text">{failure.title}</h3>
          <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{failure.detail}</p>
          {failure.limitRefunded && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-verify/30 bg-verify-soft px-2 py-0.5 text-[12px] font-semibold text-verify">
              <ShieldCheck size={13} strokeWidth={2.2} />
              Not counted against your limit
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 border-t border-flag/20 bg-panel/50 px-5 py-3">
        {onRetry && (
          <button type="button" onClick={onRetry} className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-[13.5px] font-semibold text-on-brand hover:brightness-110">
            <RotateCcw size={16} strokeWidth={2.2} />
            Try again
          </button>
        )}
        <span className="ml-auto font-mono text-[11px] text-muted">{failure.code}</span>
      </div>
    </div>
  );
}

function Compression({ wordsIn, wordsOut }: { wordsIn: number; wordsOut: number }) {
  // A very short source can come back no shorter: say so instead of "-40% shorter".
  const ratio = wordsIn > 0 ? Math.min(1, wordsOut / wordsIn) : 1;
  const shorter = wordsIn > 0 && wordsOut < wordsIn;
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-panel-raised/60 px-3.5 py-2">
      <div className="flex-1">
        <Reduction ratio={ratio} thick />
      </div>
      <div className="text-right font-mono text-[11.5px] leading-snug text-muted">
        <div>
          {wordsIn} → <span className="text-text">{wordsOut}</span> words ·{" "}
          <span className="font-semibold text-brand-strong">{shorter ? `${Math.round((1 - ratio) * 100)}% shorter` : "not shorter"}</span>
        </div>
        <div className="flex items-center justify-end gap-1">
          <Timer size={11} strokeWidth={2.2} className="text-brand-strong" />
          reads in {readingSeconds(wordsOut)} s, not {readingSeconds(wordsIn)} s
        </div>
      </div>
    </div>
  );
}

function Telemetry({ summary }: { summary: Summary }) {
  return (
    <footer className="flex items-center gap-4 border-t border-border px-5 py-2.5 font-mono text-[11.5px] text-muted max-md:flex-wrap max-md:gap-x-3 max-md:gap-y-1 max-md:px-4">
      <span className="flex items-center gap-1.5 text-brand-strong">
        <Check size={13} strokeWidth={2.4} />
        Saved
      </span>
      <span className="flex items-center gap-1.5">
        <Cpu size={12.5} strokeWidth={2} className="text-input" />
        {summary.model}
      </span>
      <span className="flex items-center gap-1.5">
        <Timer size={12.5} strokeWidth={2} className="text-input" />
        {summary.seconds.toFixed(1)} s
      </span>
      <span>
        {summary.usage.inputTokens} in · {summary.usage.outputTokens} out tokens
      </span>
      <span className="ml-auto flex items-center gap-1.5 text-figure">
        <Coins size={12.5} strokeWidth={2} />${summary.usage.costUsd.toFixed(4)}
      </span>
    </footer>
  );
}

export function SummaryPanel(props: DoneProps | RunningProps | IdleProps) {
  if (props.state === "idle") return <IdlePanel length={props.length} hint={props.hint} onDistill={props.onDistill} />;
  const lengthKey = props.state === "done" ? props.summary.length : props.length;
  const length = lengthStyles[lengthKey];
  const LengthIcon = length.icon;

  return (
    <section className="relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-brand-line/60 bg-panel shadow-[0_24px_80px_-30px_var(--glow),0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-strong/70 to-transparent" aria-hidden />

      <header className="flex items-center gap-3 px-5 pb-3 pt-4 max-md:flex-wrap max-md:gap-x-2.5 max-md:gap-y-3 max-md:px-4">
        <Sparkles size={18} strokeWidth={1.9} className="mt-0.5 shrink-0 self-start text-brand-strong" />
        {props.state === "done" && props.variant === "saved" ? (
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-[17px] font-semibold leading-snug tracking-[-0.01em]">{props.summary.title}</h2>
            <div className="mt-1.5 flex items-center gap-2.5">
              <span className={`flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-[12px] font-semibold ${length.on}`}>
                <LengthIcon size={13} strokeWidth={2.2} />
                {length.label}
              </span>
              <span className="font-mono text-[11.5px] text-muted">{props.savedAt}</span>
            </div>
          </div>
        ) : (
          <h2 className="text-[18px] font-semibold tracking-[-0.01em]">Summary</h2>
        )}
        {!(props.state === "done" && props.variant === "saved") && (
          <span className={`flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-[12px] font-semibold max-md:hidden ${length.on}`}>
            <LengthIcon size={13} strokeWidth={2.2} />
            {length.label}
          </span>
        )}
        {props.state === "done" ? (
          <div className="ml-auto flex shrink-0 gap-2">
            {props.links && props.view?.mode !== "column" && (
              <button
                type="button"
                onClick={props.links.onToggle}
                aria-pressed={props.links.mode === "always"}
                title={props.links.mode === "always" ? "Links show for every point. Click to show them on hover only." : "Links show on hover. Click to show them for every point."}
                className={`flex items-center gap-2 rounded-xl border py-1.5 pl-2.5 pr-3.5 text-[13px] font-semibold ${
                  props.links.mode === "always" ? "border-brand-line bg-brand-soft text-brand-strong" : "border-border-strong text-muted hover:text-text"
                }`}
              >
                {props.links.mode === "always" ? <Waypoints size={17} strokeWidth={1.9} /> : <MousePointer2 size={17} strokeWidth={1.9} />}
                {props.links.mode === "always" ? "Links on" : "Links on hover"}
              </button>
            )}
            {props.view && !props.view.fixed && <ViewSwitch mode={props.view.mode} onChange={props.view.onChange} />}
            <button
              type="button"
              onClick={props.onCopy}
              aria-live="polite"
              className="flex items-center gap-2 rounded-xl border border-brand-line py-1.5 pl-2.5 pr-3.5 text-[13px] font-semibold text-text hover:bg-brand-soft"
            >
              {props.copied ? (
                <ClipboardCheck size={18} strokeWidth={1.9} className="text-verify" />
              ) : (
                <ClipboardCopy size={18} strokeWidth={1.9} className="text-brand-strong" />
              )}
              {props.copied ? "Copied" : "Copy"}
            </button>
            {props.variant === "saved" ? (
              props.deleteHref && (
                <a href={props.deleteHref} className="flex items-center gap-2 rounded-xl border border-clear/35 py-1.5 pl-2.5 pr-3.5 text-[13px] font-semibold text-clear hover:bg-clear-soft">
                  <Trash2 size={17} strokeWidth={1.9} />
                  Delete
                </a>
              )
            ) : (
              props.openHref && (
                <a href={props.openHref} className="flex items-center gap-2 rounded-xl border border-border-strong py-1.5 pl-2.5 pr-3.5 text-[13px] font-semibold text-muted hover:text-text">
                  <ArrowUpRight size={18} strokeWidth={1.9} />
                  Open
                </a>
              )
            )}
          </div>
        ) : props.run.failed ? (
          <div className="ml-auto flex items-center gap-2 font-mono text-[12px] text-flag">
            <TriangleExclamationPoint size={14} strokeWidth={2.2} />
            stopped at {(props.run.elapsedMs / 1000).toFixed(1)} s
          </div>
        ) : (
          <div className="ml-auto flex items-center gap-2 font-mono text-[12px] text-brand-strong">
            <LoaderCircle size={14} strokeWidth={2.2} className="animate-spin" />
            {(props.run.elapsedMs / 1000).toFixed(1)} s
          </div>
        )}
      </header>

      {props.state === "running" ? (
        <>
          <div className="mx-5 rounded-xl border border-border bg-panel-raised/60 px-4 py-3.5">
            <DistillProgress run={props.run} />
          </div>
          {props.run.failed ? (
            <div className="min-h-0 flex-1 px-5 py-4">
              <FailureCard failure={props.run.failed} onRetry={props.onRetry} />
            </div>
          ) : (
            <ScrollArea as="ol" fade="panel" className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-2">
              {props.run.points.map((point) => (
                <PointRow key={point.id} point={point} active={false} />
              ))}
              <PointRow point={{ id: props.run.points.length + 1, text: props.run.streamingText, sourceIds: [] }} active streaming />
            </ScrollArea>
          )}
          {!props.run.failed && (
          <footer className="flex items-center gap-2 border-t border-border px-5 py-2.5 font-mono text-[11.5px] text-muted">
            <span className="text-brand-strong">
              {props.run.points.length} {props.run.points.length === 1 ? "point" : "points"} done
            </span>
            <span>·</span>
            <span>{props.wordsIn} words in</span>
          </footer>
          )}
        </>
      ) : (
        <>
          <div className="space-y-2 px-5">
            <ul data-tour="figures" className="grid grid-cols-[repeat(auto-fit,minmax(96px,1fr))] gap-2 max-md:grid-cols-2">
              {props.summary.figures.map((figure) => (
                <FigureChip key={figure.id} figure={figure} sentences={props.sentences} active={figure.id === props.focusFigureId} onFocus={props.onFocus} />
              ))}
            </ul>
            <Compression wordsIn={props.wordsIn} wordsOut={props.wordsOut} />
          </div>
          {props.view?.mode === "column" ? (
            <ol data-marker="summary-column" className="space-y-1.5 px-3 py-3">
              {props.summary.points.map((point) => (
                <PointRow key={point.id} point={point} active={point.id === props.focusPointId} sentences={props.sentences} quotes onFocus={props.onFocus} />
              ))}
            </ol>
          ) : (
            <ScrollArea as="ol" fade="panel" marker="summary-scroll" className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-2">
              {props.summary.points.map((point) => (
                <PointRow
                  key={point.id}
                  point={point}
                  active={point.id === props.focusPointId}
                  sentences={props.sentences}
                  onFocus={props.onFocus}
                />
              ))}
            </ScrollArea>
          )}
          <Telemetry summary={props.summary} />
        </>
      )}
    </section>
  );
}

function ViewSwitch({ mode, onChange }: { mode: "split" | "column"; onChange: (mode: "split" | "column") => void }) {
  const options = [
    { key: "split", label: "Split", icon: Columns2, title: "Your text beside the summary, with links drawn between them" },
    { key: "column", label: "Column", icon: Rows3, title: "One column, each point's sentences quoted under it" },
  ] as const;
  return (
    <div role="group" aria-label="Result view" className="flex rounded-xl border border-border-strong p-0.5">
      {options.map(({ key, label, icon: Icon, title }) => (
        <button
          key={key}
          type="button"
          title={title}
          aria-pressed={mode === key}
          onClick={() => mode !== key && onChange(key)}
          className={`flex items-center gap-1.5 rounded-[9px] px-2.5 py-1 text-[12.5px] font-semibold ${
            mode === key ? "bg-brand-soft text-brand-strong" : "text-muted hover:text-text"
          }`}
        >
          <Icon size={15} strokeWidth={1.9} />
          {label}
        </button>
      ))}
    </div>
  );
}

function IdlePanel({ length, hint, onDistill }: { length: SummaryLength; hint: boolean; onDistill?: () => void }) {
  const look = lengthStyles[length];
  const LengthIcon = look.icon;
  const promises = [
    { icon: Link2, tone: "text-brand-strong", text: "Every point links to the sentences it came from" },
    { icon: ShieldCheck, tone: "text-verify", text: "Every number is checked against your text" },
    { icon: Timer, tone: "text-input", text: "Points appear as Claude writes them" },
  ];
  return (
    <section className="relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-brand-line/60 bg-panel shadow-[0_24px_80px_-30px_var(--glow),0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-strong/70 to-transparent" aria-hidden />
      <header className="flex items-center gap-3 px-5 pb-3 pt-4">
        <Sparkles size={20} strokeWidth={1.9} className="mt-1 shrink-0 self-start text-brand-strong" />
        <h2 className="text-[18px] font-semibold tracking-[-0.01em]">Summary</h2>
        <span className={`flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-[12px] font-semibold ${look.on}`}>
          <LengthIcon size={13} strokeWidth={2.2} />
          {look.label}
        </span>
      </header>
      <div className="relative min-h-0 flex-1 px-4 py-2">
        {/* Ghost points: the shape of what comes, fading out. */}
        <ol className="space-y-2 opacity-70 [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" aria-hidden>
          {["72%", "58%", "66%", "49%"].map((w, i) => (
            <li key={i} className="flex gap-4 rounded-xl border border-border/60 px-4 py-4">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-border font-mono text-[11px] text-faint">{i + 1}</span>
              <span className="flex-1 space-y-2 pt-1">
                <span className="block h-2.5 rounded-full bg-border-strong/70" style={{ width: w }} />
                <span className="block h-2.5 w-11/12 rounded-full bg-border/80" />
              </span>
            </li>
          ))}
        </ol>
        <div className="absolute inset-0 grid place-items-center">
          <ul className="space-y-3 rounded-2xl border border-border bg-panel/95 px-6 py-5 shadow-[var(--shadow-dialog)]">
            {promises.map(({ icon: Icon, tone, text }) => (
              <li key={text} className="flex items-center gap-3 text-[14px]">
                <Icon size={17} strokeWidth={2} className={tone} />
                {text}
              </li>
            ))}
            {hint &&
              (onDistill ? (
                // Text is in: the button sits where the eye already is, the same Distill as the one above.
                <li className="flex items-center gap-3 border-t border-border pt-3">
                  <span className="font-mono text-[11.5px] text-muted">Your text is ready</span>
                  <button
                    type="button"
                    onClick={onDistill}
                    className="ml-auto flex items-center gap-2 rounded-xl bg-brand py-2 pl-3.5 pr-2 text-[13.5px] font-semibold text-on-brand shadow-[0_6px_24px_-8px_var(--brand)] hover:brightness-110"
                  >
                    <FlaskConical size={16} strokeWidth={2.2} />
                    Distill
                    <kbd className="ml-1 rounded-md border border-white/15 bg-black/15 px-1.5 py-0.5 font-mono text-[10.5px] font-medium opacity-80">Ctrl ↵</kbd>
                  </button>
                </li>
              ) : (
                <li className="flex items-center gap-2 border-t border-border pt-3 font-mono text-[11.5px] text-muted">
                  Paste your text, then
                  <kbd className="rounded-md border border-border-strong px-1.5 py-0.5 text-[10.5px] text-text">Ctrl ↵</kbd>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
