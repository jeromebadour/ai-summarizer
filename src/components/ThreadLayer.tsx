"use client";

import { useLayoutEffect, useRef, useState } from "react";

type Thread = { d: string; from: [number, number]; to: [number, number] };

/**
 * Draws curves from the focused point or figure to each source sentence it cites.
 * Measures inside its own parent, so it must sit in the positioned element that holds both panels.
 */
export function ThreadLayer({ origin: selector, sentenceIds }: { origin: string | null; sentenceIds: number[] }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const layer = useRef<SVGSVGElement>(null);

  useLayoutEffect(() => {
    const root = layer.current?.parentElement;
    if (!root) return;

    const measure = () => {
      const origin = selector ? root.querySelector(selector) : null;
      if (!origin) {
        setThreads([]);
        return;
      }
      const box = root.getBoundingClientRect();
      const o = origin.getBoundingClientRect();
      const from: [number, number] = [o.left - box.left, o.top - box.top + Math.min(o.height / 2, 28)];

      const panel = root.querySelector("[data-source-panel]")?.getBoundingClientRect();
      const visible = root.querySelector("[data-source-scroll]")?.getBoundingClientRect();
      if (!panel || !visible) {
        setThreads([]);
        return;
      }
      const edge = panel.right - box.left - 7;

      const next = sentenceIds.flatMap((id) => {
        const target = root.querySelector(`[data-sentence="${id}"]`)?.getBoundingClientRect();
        // A sentence scrolled out of view gets no thread (it would point at nothing).
        if (!target || target.bottom < visible.top || target.top > visible.bottom) return [];
        const to: [number, number] = [edge, target.top - box.top + target.height / 2];
        const bend = Math.max(40, (from[0] - to[0]) * 0.5);
        return [{ from, to, d: `M ${from[0]} ${from[1]} C ${from[0] - bend} ${from[1]}, ${to[0] + bend} ${to[1]}, ${to[0]} ${to[1]}` }];
      });
      setThreads(next);
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
  }, [selector, sentenceIds]);

  return (
    <svg ref={layer} className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible" aria-hidden>
      {threads.map((thread, index) => (
        <g key={index}>
          <path d={thread.d} fill="none" stroke="var(--brand-strong)" strokeOpacity="0.55" strokeWidth="1.5" />
          <circle cx={thread.to[0]} cy={thread.to[1]} r="3.5" fill="var(--brand-strong)" stroke="var(--paper)" strokeWidth="2" />
        </g>
      ))}
      {threads[0] && <circle cx={threads[0].from[0]} cy={threads[0].from[1]} r="4" fill="var(--brand-strong)" stroke="var(--panel)" strokeWidth="2" />}
    </svg>
  );
}
