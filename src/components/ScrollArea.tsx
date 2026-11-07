"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type ScrollAreaProps = {
  as?: "div" | "ol" | "ul";
  className: string;
  /** Background the fade blends into: the surface the list sits on. */
  fade: "panel" | "paper";
  /** Marks the scroller for code that measures it (e.g. the threads). */
  marker?: string;
  children: ReactNode;
};

/** A scrolling list that shows a soft fade at the bottom only while there is more below. */
export function ScrollArea({ as: Tag = "div", className, fade, marker, children }: ScrollAreaProps) {
  const ref = useRef<HTMLElement>(null);
  const [more, setMore] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 2);
    check();
    el.addEventListener("scroll", check, { passive: true });
    const observer = new ResizeObserver(check);
    observer.observe(el);
    Array.from(el.children).forEach((child) => observer.observe(child));
    return () => {
      el.removeEventListener("scroll", check);
      observer.disconnect();
    };
  }, [children]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <Tag ref={ref as never} className={className} {...(marker ? { [`data-${marker}`]: "" } : {})}>
        {children}
      </Tag>
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t to-transparent transition-opacity duration-200 ${
          fade === "panel" ? "from-panel" : "from-paper"
        } ${more ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
