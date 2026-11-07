export type SummaryLength = "short" | "medium" | "bullets";

export type SourceSentence = {
  id: number;
  text: string;
  paragraph: number;
};

export type SummaryPoint = {
  id: number;
  text: string;
  sourceIds: number[];
};

export type KeyFigure = {
  id: number;
  value: string;
  label: string;
  sourceIds: number[];
};

export type Usage = {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

export type Summary = {
  title: string;
  length: SummaryLength;
  points: SummaryPoint[];
  figures: KeyFigure[];
  model: string;
  seconds: number;
  usage: Usage;
};

export type FigureStatus = "checked" | "flagged" | "none";

/** One row in the Saved list. */
export type SavedItem = {
  id: string;
  title: string;
  length: SummaryLength;
  createdAt: string;
  /** The day it was saved (YYYY-MM-DD), for stats and charts. */
  date: string;
  wordsIn: number;
  wordsOut: number;
  figureStatus: FigureStatus;
  preview: string;
  keyFigures: string[];
};

export type DistillStep = "checking" | "sending" | "writing" | "linking" | "saving";

export const distillSteps: DistillStep[] = ["checking", "sending", "writing", "linking", "saving"];

export type DistillFailure = {
  title: string;
  detail: string;
  code: string;
  limitRefunded: boolean;
};

export type DistillRun = {
  step: DistillStep;
  failed?: DistillFailure;
  elapsedMs: number;
  stepMs: Partial<Record<DistillStep, number>>;
  points: SummaryPoint[];
  streamingText: string;
};

/** What the reader is pointing at: a summary point, a key figure, or a source sentence. */
export type Focus = { kind: "point"; id: number } | { kind: "figure"; id: number } | { kind: "sentence"; id: number } | null;

const wordsPerMinute = 230;

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

export function readingSeconds(words: number): number {
  return Math.max(1, Math.round((words / wordsPerMinute) * 60));
}

export function pointForSentence(points: SummaryPoint[], sentenceId: number): SummaryPoint | undefined {
  return points.find((point) => point.sourceIds.includes(sentenceId));
}

/** The source sentences lit by the current focus. */
export function focusedSentenceIds(focus: Focus, summary: Pick<Summary, "points" | "figures">): number[] {
  if (focus === null) return [];
  if (focus.kind === "sentence") return pointForSentence(summary.points, focus.id)?.sourceIds ?? [focus.id];
  const list = focus.kind === "point" ? summary.points : summary.figures;
  return list.find((item) => item.id === focus.id)?.sourceIds ?? [];
}

/** The summary point lit by the current focus (a sentence lights the point that cites it). */
export function focusedPointId(focus: Focus, points: SummaryPoint[]): number | null {
  if (focus === null || focus.kind === "figure") return null;
  if (focus.kind === "point") return focus.id;
  return pointForSentence(points, focus.id)?.id ?? null;
}
