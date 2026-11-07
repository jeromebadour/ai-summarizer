"use client";

import { useEffect, useState } from "react";

/** The page's sections, numbered, with the one being read marked as you scroll. */
export function OnThisPage({ sections }: { sections: { id: string; title: string }[] }) {
  const [current, setCurrent] = useState(sections[0]?.id);

  useEffect(() => {
    const seen = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting);
        const first = sections.find((s) => seen.get(s.id));
        if (first) setCurrent(first.id);
      },
      { rootMargin: "-80px 0px -55% 0px" },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav aria-label="On this page" className="rounded-2xl border border-border bg-panel/70 p-3">
      <div className="px-2 pb-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">On this page</div>
      <ol className="space-y-0.5">
        {sections.map((s, i) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              aria-current={s.id === current ? "true" : undefined}
              className={`grid grid-cols-[20px_minmax(0,1fr)] items-baseline gap-1.5 rounded-lg px-2 py-1 text-[12.5px] transition-colors ${
                s.id === current ? "bg-brand-soft font-semibold text-brand-strong" : "text-muted hover:bg-panel-raised hover:text-text"
              }`}
            >
              <span className="font-mono text-[10.5px] opacity-70">{i + 1}</span>
              {s.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
