"use client";

import { FlaskConical, Hourglass, LoaderCircle, OctagonPause } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { LengthPicker } from "@/components/LengthPicker";
import { LimitStrip } from "@/components/LimitStrip";
import { QuotaRing } from "@/components/QuotaRing";
import { ResultView } from "@/components/ResultView";
import { SourcePanel } from "@/components/SourcePanel";
import { StatusPill, type AppStatus } from "@/components/StatusPill";
import { StopStrip, type AppStop } from "@/components/StopStrip";
import { SummaryPanel } from "@/components/SummaryPanel";
import { Composer } from "@/components/Composer";
import { MAX_SOURCE_CHARS, MIN_SOURCE_WORDS } from "@/lib/distill";
import { splitSentences } from "@/lib/sentences";
import { stopFor } from "@/lib/stops";
import { countWords, type DistillFailure, type DistillRun, type DistillStep, type SourceSentence, type Summary, type SummaryLength, type SummaryPoint } from "@/lib/summary";
import type { WorkspaceState } from "@/lib/server/workspace";

const stepLabel: Record<DistillStep, string> = {
  checking: "Checking your limit",
  sending: "Sending to Claude",
  writing: "Writing points",
  linking: "Linking to source",
  saving: "Saving",
};

const blankRun = (): DistillRun => ({ step: "checking", elapsedMs: 0, stepMs: {}, points: [], streamingText: "" });

/** "14:05" in the viewer's own clock (the browser's zone). */
function clock(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** The next midnight UTC (when daily limits and the daily cap reset), in the viewer's clock. */
function nextUtcMidnight(): string {
  const now = new Date();
  return clock(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)));
}

type Phase = "editing" | "running" | "done";

/**
 * The Distill screen: paste, distill, read. Every stage shown is a real stage reported by /api/summarize, points
 * appear as Claude finishes them, and anything that stops a summary (the hour, a pause, a cap) shows as a calm strip
 * before anyone presses Distill, from the same rules the server applies.
 */
export function DistillWorkspace({
  initial,
  defaultLength,
  guest,
  sampleText,
  links,
  view,
  phone = false,
}: {
  initial: WorkspaceState;
  defaultLength: SummaryLength;
  guest: boolean;
  sampleText: string;
  links: "always" | "hover";
  view: "split" | "column";
  phone?: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [length, setLength] = useState<SummaryLength>(defaultLength);
  const [quota, setQuota] = useState(initial.quota);
  const [hour, setHour] = useState(initial.hour);
  const [stop, setStop] = useState<AppStop | null>(initial.stop);
  const [phase, setPhase] = useState<Phase>("editing");
  const [run, setRun] = useState<DistillRun>(blankRun);
  const [sentences, setSentences] = useState<SourceSentence[]>([]);
  const [result, setResult] = useState<{ summary: Summary; id: string; savedAt: string } | null>(null);
  const abort = useRef<AbortController | null>(null);
  const started = useRef(0);
  const stepStarted = useRef(0);

  // A server refresh (after a refusal) brings the real quota, hour window and stop: take them in during render
  // (React's pattern for state that follows a prop), not in an effect.
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setQuota(initial.quota);
    setHour(initial.hour);
    setStop(initial.stop);
  }

  // The elapsed time is the real clock since Distill, not a fake progress timer.
  useEffect(() => {
    if (phase !== "running" || run.failed) return;
    const timer = setInterval(() => setRun((r) => ({ ...r, elapsedMs: Date.now() - started.current })), 100);
    return () => clearInterval(timer);
  }, [phase, run.failed]);

  useEffect(() => () => abort.current?.abort(), []);

  const over = text.length > MAX_SOURCE_CHARS;
  const words = countWords(text);
  // Some text, but not enough to have anything to leave out: the card says so, and nothing is counted.
  const short = words > 0 && words < MIN_SOURCE_WORDS;
  const blocked = stop !== null || hour !== null;
  // A failed run can be tried again; a live one can't be started twice.
  const canRun = (phase !== "running" || run.failed !== undefined) && text.trim() !== "" && !over && !short && !blocked;

  const fail = useCallback((failure: DistillFailure) => {
    setRun((r) => ({ ...r, failed: failure, elapsedMs: Date.now() - started.current }));
    if (failure.limitRefunded) setQuota((q) => ({ ...q, used: Math.max(0, q.used - 1), dayUsed: q.dayUsed === undefined ? undefined : Math.max(0, q.dayUsed - 1) }));
  }, []);

  const distill = useCallback(async () => {
    if (!canRun) return;
    const controller = new AbortController();
    abort.current?.abort();
    abort.current = controller;
    started.current = Date.now();
    stepStarted.current = started.current;
    setResult(null);
    setRun(blankRun());
    setSentences(splitSentences(text)); // replaced by the server's own split as soon as it arrives
    setPhase("running");

    const setStep = (step: DistillStep) =>
      setRun((r) => {
        const now = Date.now();
        const stepMs = { ...r.stepMs, [r.step]: now - stepStarted.current };
        stepStarted.current = now;
        return { ...r, step, stepMs };
      });

    let response: Response;
    try {
      response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, length }),
        signal: controller.signal,
      });
    } catch {
      if (!controller.signal.aborted) {
        fail({ title: "Distill couldn't be reached", detail: "Check your connection. Your text is still here; try again.", code: "network", limitRefunded: false });
      }
      return;
    }
    if (response.status === 401) {
      router.push("/login?done=session-ended");
      return;
    }
    if (!response.ok || !response.body) {
      const message = await response.json().then((b: { error?: string }) => b.error).catch(() => undefined);
      fail({ title: message ?? "This text can't be summarized", detail: "Nothing was sent to Claude and nothing was counted.", code: `HTTP ${response.status}`, limitRefunded: false });
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finished = false;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          switch (event.type) {
            case "step":
              setStep(event.step);
              break;
            case "quota":
              setQuota((q) => ({ ...q, used: event.used, limit: event.limit, resetsAt: event.nextFreeAt ? clock(event.nextFreeAt) : q.resetsAt, dayUsed: q.dayUsed === undefined ? undefined : q.dayUsed + 1 }));
              break;
            case "source":
              setSentences(event.sentences);
              break;
            case "partial":
              setRun((r) => ({ ...r, streamingText: event.text }));
              break;
            case "point":
              setRun((r) => ({ ...r, points: [...r.points, event.point as SummaryPoint], streamingText: "" }));
              break;
            case "refused": {
              finished = true;
              const backAt = event.nextFreeAt ? clock(event.nextFreeAt) : nextUtcMidnight();
              const why = stopFor(event.reason, { guest, backAt });
              setPhase("editing"); // the text stays where it was
              if (why && why !== "hour") setStop(why);
              router.refresh(); // the server's real quota and hour window
              break;
            }
            case "done":
              finished = true;
              setResult({ summary: event.summary as Summary, id: event.id, savedAt: clock(new Date()) });
              setPhase("done");
              break;
            case "failed":
              finished = true;
              fail(event.failure as DistillFailure);
              break;
          }
        }
      }
    } catch {
      if (!controller.signal.aborted) {
        fail({ title: "The connection dropped", detail: "Your text is still here; try again.", code: "stream", limitRefunded: false });
      }
      return;
    }
    if (!finished && !controller.signal.aborted) {
      fail({ title: "The answer stopped early", detail: "Your text is still here; try again.", code: "stream", limitRefunded: false });
    }
  }, [canRun, text, length, guest, fail, router]);

  // Ctrl+Enter (Cmd+Enter on a Mac) distills from anywhere on the screen.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        void distill();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [distill]);

  const edit = (next: string) => {
    setText(next);
    if (phase !== "editing") {
      setPhase("editing");
      setResult(null);
    }
  };
  const clear = () => {
    abort.current?.abort();
    setText("");
    setPhase("editing");
    setResult(null);
    setRun(blankRun());
  };
  const paste = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip) edit(clip);
    } catch {
      // The browser said no to reading the clipboard: the text area takes Ctrl+V as usual.
      setPhase("editing");
      requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>("textarea")?.focus());
    }
  };

  const status: AppStatus =
    phase === "running"
      ? run.failed
        ? { kind: "error", label: run.failed.title.length > 34 ? "Not summarized" : run.failed.title }
        : { kind: "working", label: stepLabel[run.step], elapsedMs: run.elapsedMs }
      : phase === "done" && result
        ? { kind: "saved", at: result.savedAt }
        : { kind: "ready" };

  const running = phase === "running" && !run.failed;
  const buttonLabel = running ? "Distilling" : hour ? `Next at ${hour.nextFree}` : stop?.kind === "paused" ? "Paused" : stop ? "Stopped" : "Distill";
  const ButtonIcon = running ? LoaderCircle : hour ? Hourglass : stop ? OctagonPause : FlaskConical;

  return (
    <>
      <div className="flex items-center gap-4 max-md:flex-wrap max-md:gap-2">
        <LengthPicker value={length} onChange={setLength} disabled={running} />
        <StatusPill status={status} />
        {/* The primary action sits at the end of the row, top right, after the quota it spends. */}
        <div className="ml-auto">
          <QuotaRing {...quota} />
        </div>
        <button
          type="button"
          onClick={() => void distill()}
          disabled={!canRun}
          className={`flex items-center gap-2 rounded-xl bg-brand py-2.5 pl-4 pr-2.5 text-[14px] font-semibold text-on-brand max-md:hidden shadow-[0_6px_24px_-8px_var(--brand)] hover:brightness-110 disabled:bg-brand-soft disabled:text-brand-strong disabled:shadow-none`}
        >
          <ButtonIcon size={17} strokeWidth={2.2} className={running ? "animate-spin" : undefined} />
          {buttonLabel}
          {canRun && <kbd className="ml-1.5 max-md:hidden rounded-md border border-white/15 bg-black/15 px-1.5 py-0.5 font-mono text-[10.5px] font-medium opacity-80">Ctrl ↵</kbd>}
        </button>
      </div>

      {stop && <StopStrip stop={stop} />}
      {hour && !stop && <LimitStrip limit={quota.limit} usedAt={hour.usedAt} now={hour.now} nextFree={hour.nextFree} minutesToNext={hour.minutesToNext} />}

      {phase === "done" && result ? (
        <ResultView
          links={links}
          view={view}
          phone={phone}
          sentences={sentences}
          summary={result.summary}
          charLimit={MAX_SOURCE_CHARS}
          initialFocus={null}
          variant="result"
          openHref={`/saved/${result.id}`}
          onPaste={paste}
          onClear={clear}
        />
      ) : phase === "running" ? (
        // Opening out of the composer: the text slides left into the source pane, the summary rises in on the right.
        <div className="grid min-h-0 flex-1 grid-cols-[0.8fr_1.2fr] gap-5 max-md:grid-cols-1 max-md:[&>*:first-child]:hidden [&>*:first-child]:animate-[open-left_420ms_cubic-bezier(.2,.8,.2,1)] [&>*:nth-child(2)]:animate-[open-right_520ms_cubic-bezier(.2,.8,.2,1)]">
          <SourcePanel
            sentences={sentences}
            points={run.points}
            litSentenceIds={[]}
            charCount={text.length}
            charLimit={MAX_SOURCE_CHARS}
            locked={running}
            finished={false}
            onPaste={paste}
            onClear={clear}
          />
          <SummaryPanel state="running" run={run} length={length} wordsIn={countWords(text)} onRetry={() => void distill()} />
        </div>
      ) : (
        // Before Distill: the composer alone, centred. No summary side until there is something to put there.
        <Composer
          text={text}
          words={words}
          charLimit={MAX_SOURCE_CHARS}
          canRun={canRun}
          short={short}
          blocked={blocked}
          onChange={edit}
          onPaste={paste}
          onClear={clear}
          onSample={() => edit(sampleText)}
          onDistill={() => void distill()}
        />
      )}
    </>
  );
}
