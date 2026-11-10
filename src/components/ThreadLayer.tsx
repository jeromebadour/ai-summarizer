"use client";

import { useLayoutEffect, useRef, useState } from "react";

/** One point or figure and the source sentences it cites. `strong` is the one in focus. */
export type ThreadSource = { origin: string; sentenceIds: number[]; strong: boolean };
type Thread = { d: string; from: [number, number]; to: [number, number]; strong: boolean };

/**
 * Draws curves from points or figures to each source sentence they cite: quietly for every point when links show
 * always, and strongly for the one in focus. Measures inside its own parent, so it must sit in the positioned element
 * that holds both panels.
 */
export function ThreadLayer({ sources }: { sources: ThreadSource[] }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const layer = useRef<SVGSVGElement>(null);
  const key = JSON.stringify(sources);

  useLayoutEffect(() => {
    const root = layer.current?.parentElement;
    if (!root) return;
    const list: ThreadSource[] = JSON.parse(key);

    const measure = () => {
      const box = root.getBoundingClientRect();
      const panel = root.querySelector("[data-source-panel]")?.getBoundingClientRect();
      const visible = root.querySelector("[data-source-scroll]")?.getBoundingClientRect();
      const summary = root.querySelector("[data-summary-scroll]")?.getBoundingClientRect();
      if (!panel || !visible) {
        setThreads([]);
        return;
      }
      const edge = panel.right - box.left - 7;

      const next = list.flatMap(({ origin: selector, sentenceIds, strong }) => {
        const origin = root.querySelector(selector)?.getBoundingClientRect();
        if (!origin) return [];
        const fromY = origin.top + Math.min(origin.height / 2, 22);
        // A point whose start is scrolled out of the summary list gets no threads (they would start from nowhere).
        if (summary && selector.startsWith("[data-point") && (fromY < summary.top + 4 || fromY > summary.bottom - 4)) return [];
        const from: [number, number] = [origin.left - box.left, fromY - box.top];
        return sentenceIds.flatMap((id) => {
          const target = root.querySelector(`[data-sentence="${id}"]`)?.getBoundingClientRect();
          // A sentence scrolled out of view gets no thread (it would point at nothing).
          if (!target || target.bottom < visible.top || target.top > visible.bottom) return [];
          const to: [number, number] = [edge, target.top - box.top + target.height / 2];
          const bend = Math.max(40, (from[0] - to[0]) * 0.5);
          return [{ from, to, strong, d: `M ${from[0]} ${from[1]} C ${from[0] - bend} ${from[1]}, ${to[0] + bend} ${to[1]}, ${to[0]} ${to[1]}` }];
        });
      });
      // The strong threads last, so they draw on top of the quiet ones.
      setThreads(next.sort((a, b) => Number(a.strong) - Number(b.strong)));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    const sourceScroll = root.querySelector("[data-source-scroll]");
    if (sourceScroll) observer.observe(sourceScroll);
    // Either panel can scroll; keep the threads attached to what is on screen.
    root.addEventListener("scroll", measure, true);
    return () => {
      observer.disconnect();
      root.removeEventListener("scroll", measure, true);
    };
  }, [key]);

  const origins = threads.filter((t) => t.strong).slice(0, 1);
  return (
    <svg ref={layer} data-threads={threads.length} className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible" aria-hidden>
      {threads.map((thread, index) => (
        <g key={index}>
          <path d={thread.d} fill="none" stroke="var(--copper)" strokeOpacity={thread.strong ? 0.85 : 0.35} strokeWidth={thread.strong ? 2 : 1.4} />
          <circle cx={thread.to[0]} cy={thread.to[1]} r={thread.strong ? 3.5 : 2.5} fill="var(--copper)" fillOpacity={thread.strong ? 1 : 0.5} stroke="var(--paper)" strokeWidth="2" />
        </g>
      ))}
      {origins.map((t, i) => (
        <circle key={i} cx={t.from[0]} cy={t.from[1]} r="4" fill="var(--copper)" stroke="var(--panel)" strokeWidth="2" />
      ))}
    </svg>
  );
}
