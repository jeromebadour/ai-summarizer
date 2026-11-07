import { FlaskConical, Hourglass, LoaderCircle, OctagonPause } from "lucide-react";
import { Suspense } from "react";
import { LengthPicker } from "@/components/LengthPicker";
import { LimitStrip } from "@/components/LimitStrip";
import { StopStrip, type AppStop } from "@/components/StopStrip";
import { LoadingScreen } from "@/components/LoadingScreen";
import { QuotaRing } from "@/components/QuotaRing";
import { Rail } from "@/components/Rail";
import { ResultView } from "@/components/ResultView";
import { SourcePanel } from "@/components/SourcePanel";
import { StatusPill } from "@/components/StatusPill";
import { SummaryPanel } from "@/components/SummaryPanel";
import { sampleSentences as sentences, sampleSummary as summary } from "@/lib/sample";
import { requireAccount } from "@/lib/server/account";
import { countWords, type DistillRun, type Summary } from "@/lib/summary";

const charLimit = 20000;

const run: DistillRun = {
  step: "writing",
  elapsedMs: 1240,
  stepMs: { checking: 38, sending: 412 },
  points: [summary.points[0]],
  streamingText: "A third of the homes will be affordable. Private money and a $40M state",
};

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<LoadingScreen label="Loading your workspace" />}>
      <Workspace searchParams={searchParams} />
    </Suspense>
  );
}

async function Workspace({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { account } = await requireAccount();
  const params = await searchParams;
  const failed = params.state === "error";
  const limited = params.state === "limit";
  // Sample states for the pictures, until this screen is wired: the app stopped for everyone.
  const stop: AppStop | null = params.state === "paused" ? { kind: "paused", guests: false } : params.state === "daily" ? { kind: "dailyCap", backAt: "03:00" } : null;
  const stopped = stop !== null;
  const running = params.state === "running" || failed;
  const active = params.state === "running";
  const shownRun: DistillRun = failed
    ? {
        step: "sending",
        elapsedMs: 31200,
        stepMs: { checking: 41 },
        points: [],
        streamingText: "",
        failed: {
          title: "Claude is overloaded right now",
          detail: "The request reached Claude but it could not take it. Your text is still here; try again in a moment.",
          code: "HTTP 529 · req_7f3a9c",
          limitRefunded: true,
        },
      }
    : run;
  const shown: Summary =
    params.flag === "1"
      ? {
          ...summary,
          figures: summary.figures.map((f) => (f.id === 6 ? { ...f, value: "8 yrs" } : f)),
          points: summary.points.map((p) => (p.id === 3 ? { ...p, text: p.text.replace("two access roads", "three access roads") } : p)),
        }
      : summary;
  const source = sentences.map((s) => s.text).join(" ");

  return (
    <div className="flex h-screen">
      <Rail page="distill" account={account} />
      <main className="flex min-w-0 flex-1 flex-col gap-5 p-6">
        <div className="flex items-center gap-4">
          <LengthPicker value={summary.length} />
          <button
            type="button"
            disabled={active || limited || stopped}
            className="flex items-center gap-2 rounded-xl bg-brand py-2.5 pl-4 pr-2.5 text-[14px] font-semibold text-on-brand shadow-[0_6px_24px_-8px_var(--brand)] hover:brightness-110 disabled:bg-brand-soft disabled:text-brand-strong disabled:shadow-none"
          >
            {active ? (
              <LoaderCircle size={17} strokeWidth={2.2} className="animate-spin" />
            ) : limited ? (
              <Hourglass size={17} strokeWidth={2.2} />
            ) : stopped ? (
              <OctagonPause size={17} strokeWidth={2.2} />
            ) : (
              <FlaskConical size={17} strokeWidth={2.2} />
            )}
            {active ? "Distilling" : limited ? "Next at 12:00" : stop?.kind === "paused" ? "Paused" : stopped ? "Back at 03:00" : "Distill"}
            {!limited && !active && !stopped && <kbd className="ml-1.5 rounded-md border border-white/15 bg-black/15 px-1.5 py-0.5 font-mono text-[10.5px] font-medium opacity-80">Ctrl ↵</kbd>}
          </button>
          <StatusPill
            status={
              failed
                ? { kind: "error", label: "Claude unavailable" }
                : limited
                  ? { kind: "saved", label: "Saved", at: "11:36" }
                : active
                  ? { kind: "working", label: "Writing points", elapsedMs: run.elapsedMs }
                  : { kind: "saved", at: "11:52" }
            }
          />
          <div className="ml-auto">
            <QuotaRing used={limited ? 10 : 1} limit={10} resetsAt={limited ? "12:00" : "12:52"} dayUsed={limited ? 16 : 2} dayLimit={30} />
          </div>
        </div>

        {stop && <StopStrip stop={stop} />}
        {limited && <LimitStrip limit={10} usedAt={[23, 25, 28, 31, 35, 39, 44, 49, 53, 57]} now="11:37" nextFree="12:00" minutesToNext={23} />}

        {running ? (
          <div className="grid min-h-0 flex-1 grid-cols-[0.8fr_1.2fr] gap-6">
            <SourcePanel sentences={sentences} points={shownRun.points} litSentenceIds={[]} charCount={source.length} charLimit={charLimit} locked={active} finished={false} />
            <SummaryPanel state="running" run={shownRun} length={summary.length} wordsIn={countWords(source)} />
          </div>
        ) : (
          <ResultView sentences={sentences} summary={shown} charLimit={charLimit} initialFocus={{ kind: "point", id: 2 }} variant="result" />
        )}
      </main>
    </div>
  );
}
