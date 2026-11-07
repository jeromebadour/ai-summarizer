"use client";

import {
  ArrowUpRight,
  Check,
  ClipboardCopy,
  Coins,
  Cpu,
  LoaderCircle,
  RotateCcw,
  ServerCrash,
  ShieldCheck,
  Sparkles,
  Timer,
  Trash2,
  TriangleExclamationPoint,
} from "lucide-react";
import { ScrollArea } from "@/components/ScrollArea";
import { DistillProgress } from "@/components/DistillProgress";
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
};

type RunningProps = { state: "running"; run: DistillRun; length: SummaryLength; wordsIn: number };

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
  onFocus,
}: {
  point: SummaryPoint;
  active: boolean;
  streaming?: boolean;
  sentences?: SourceSentence[];
  onFocus?: (focus: Focus) => void;
}) {
  return (
    <li
      data-point={point.id}
      onMouseEnter={() => onFocus?.({ kind: "point", id: point.id })}
      className={`flex gap-4 rounded-xl border px-5 py-4 transition-colors ${
        active ? "border-brand-line bg-brand-soft" : "border-transparent hover:bg-panel-raised"
      }`}
    >
      <span
        className={`mt-1 grid size-7 shrink-0 place-items-center rounded-lg font-mono text-[12px] font-bold ${
          active ? "bg-brand text-on-brand" : "border border-border-strong bg-panel-raised text-muted"
        }`}
      >
        {point.id}
      </span>
      <div className="min-w-0">
        <p className={`text-[17px] leading-[1.65] tracking-[-0.005em] text-text ${streaming ? "caret" : ""}`}>{point.text}</p>
        {sentences && <CheckBadge point={point} sentences={sentences} />}
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
      className={`flex min-w-0 flex-col rounded-xl border px-3 py-2 transition-colors ${
        flagged
          ? "border-flag/40 bg-flag-soft"
          : active
            ? "border-figure/60 bg-figure-soft"
            : "border-border bg-panel-raised/50 hover:border-figure/40"
      }`}
    >
      <span className={`flex items-center gap-1.5 font-mono text-[17px] font-semibold tracking-tight ${flagged ? "text-flag" : "text-figure"}`}>
        {figure.value}
        {flagged ? <TriangleExclamationPoint size={13} strokeWidth={2.2} /> : <ShieldCheck size={13} strokeWidth={2.2} className="text-verify" />}
      </span>
      <span className="truncate text-[11.5px] font-medium text-muted">{figure.label}</span>
    </li>
  );
}

function FailureCard({ failure }: { failure: DistillFailure }) {
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
        <button type="button" className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-[13.5px] font-semibold text-on-brand hover:brightness-110">
          <RotateCcw size={16} strokeWidth={2.2} />
          Try again
        </button>
        <span className="ml-auto font-mono text-[11px] text-muted">{failure.code}</span>
      </div>
    </div>
  );
}

function Compression({ wordsIn, wordsOut }: { wordsIn: number; wordsOut: number }) {
  const ratio = wordsOut / wordsIn;
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-panel-raised/60 px-4 py-3">
      <div className="flex-1">
        <div className="h-1.5 rounded-full bg-border-strong" />
        <div className="mt-1.5 h-1.5 rounded-full bg-brand" style={{ width: `${ratio * 100}%` }} />
      </div>
      <div className="text-right font-mono text-[11.5px] leading-snug text-muted">
        <div>
          {wordsIn} → <span className="text-text">{wordsOut}</span> words · <span className="font-semibold text-brand-strong">{Math.round((1 - ratio) * 100)}% shorter</span>
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
    <footer className="flex items-center gap-4 border-t border-border px-7 py-3.5 font-mono text-[11.5px] text-muted">
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

export function SummaryPanel(props: DoneProps | RunningProps) {
  const lengthKey = props.state === "done" ? props.summary.length : props.length;
  const length = lengthStyles[lengthKey];
  const LengthIcon = length.icon;

  return (
    <section className="relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-brand-line/60 bg-panel shadow-[0_24px_80px_-30px_var(--glow),0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-strong/70 to-transparent" aria-hidden />

      <header className="flex items-center gap-3 px-7 pb-4 pt-6">
        <Sparkles size={20} strokeWidth={1.9} className="shrink-0 self-start mt-1 text-brand-strong" />
        {props.state === "done" && props.variant === "saved" ? (
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-[19px] font-semibold leading-snug tracking-[-0.01em]">{props.summary.title}</h2>
            <div className="mt-1.5 flex items-center gap-2.5">
              <span className={`flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-[12px] font-semibold ${length.on}`}>
                <LengthIcon size={13} strokeWidth={2.2} />
                {length.label}
              </span>
              <span className="font-mono text-[11.5px] text-muted">{props.savedAt}</span>
            </div>
          </div>
        ) : (
          <h2 className="text-[22px] font-semibold tracking-[-0.01em]">Summary</h2>
        )}
        {!(props.state === "done" && props.variant === "saved") && (
          <span className={`flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-[12px] font-semibold ${length.on}`}>
            <LengthIcon size={13} strokeWidth={2.2} />
            {length.label}
          </span>
        )}
        {props.state === "done" ? (
          <div className="ml-auto flex shrink-0 gap-2">
            <button type="button" className="flex items-center gap-2.5 rounded-xl border border-brand-line py-2 pl-3 pr-4 text-[13.5px] font-semibold text-text hover:bg-brand-soft">
              <ClipboardCopy size={21} strokeWidth={1.8} className="text-brand-strong" />
              Copy
            </button>
            {props.variant === "saved" ? (
              <button type="button" className="flex items-center gap-2.5 rounded-xl border border-clear/35 py-2 pl-3 pr-4 text-[13.5px] font-semibold text-clear hover:bg-clear-soft">
                <Trash2 size={20} strokeWidth={1.8} />
                Delete
              </button>
            ) : (
              <button type="button" className="flex items-center gap-2.5 rounded-xl border border-border-strong py-2 pl-3 pr-4 text-[13.5px] font-semibold text-muted hover:text-text">
                <ArrowUpRight size={21} strokeWidth={1.8} />
                Open
              </button>
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
          <div className="mx-7 rounded-xl border border-border bg-panel-raised/60 px-4 py-5">
            <DistillProgress run={props.run} />
          </div>
          {props.run.failed ? (
            <div className="min-h-0 flex-1 px-7 py-5">
              <FailureCard failure={props.run.failed} />
            </div>
          ) : (
            <ScrollArea as="ol" fade="panel" className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4">
              {props.run.points.map((point) => (
                <PointRow key={point.id} point={point} active={false} />
              ))}
              <PointRow point={{ id: props.run.points.length + 1, text: props.run.streamingText, sourceIds: [] }} active streaming />
            </ScrollArea>
          )}
          {!props.run.failed && (
          <footer className="flex items-center gap-2 border-t border-border px-7 py-3.5 font-mono text-[11.5px] text-muted">
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
          <div className="space-y-3 px-7">
            <ul className="grid grid-cols-[repeat(auto-fit,minmax(96px,1fr))] gap-2">
              {props.summary.figures.map((figure) => (
                <FigureChip key={figure.id} figure={figure} sentences={props.sentences} active={figure.id === props.focusFigureId} onFocus={props.onFocus} />
              ))}
            </ul>
            <Compression wordsIn={props.wordsIn} wordsOut={props.wordsOut} />
          </div>
          <ScrollArea as="ol" fade="panel" className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 py-3">
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
          <Telemetry summary={props.summary} />
        </>
      )}
    </section>
  );
}
