"use client";

import { ArrowLeft, ArrowRight, Check, ShieldUser, X } from "@/components/glyphs";
import Link from "@/components/NavLink";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";

export type TourStep = {
  /** What the spotlight sits on: a CSS selector for one element on the page; none for a closing card in the middle. */
  target?: string;
  /** A way onward from the card itself (the last step's admin demo). Following it finishes the tour. */
  action?: { href: string; label: string };
  title: string;
  body: string;
};

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 8;

/**
 * The first-time tour: a spotlight on one real part of the screen and a short card beside it. Next, Back, Skip; the
 * keyboard works too (arrows, Escape). The page behind is dimmed and can't be clicked, so a step can't be lost.
 */
export function Tour({ steps, step, onStep, onClose }: { steps: TourStep[]; step: number; onStep: (step: number) => void; onClose: (finished: boolean) => void }) {
  const current = steps[step];
  const [rect, setRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  const measure = useCallback(() => {
    const el = (current.target ? document.querySelector(current.target) : null);
    setViewport({ width: window.innerWidth, height: window.innerHeight });
    if (!el) return setRect(null);
    const r = el.getBoundingClientRect();
    setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
  }, [current.target]);

  // Bring the target into view, then measure once it has settled.
  useLayoutEffect(() => {
    const el = (current.target ? document.querySelector(current.target) : null);
    if (el && window.innerWidth < 768 && getComputedStyle(el.closest("nav") ?? el).position !== "fixed") {
      // Phone: the target goes to the top of the screen, leaving the lower part for the card.
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 16, behavior: "instant" as ScrollBehavior });
    } else {
      el?.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
    }
    const frame = requestAnimationFrame(measure);
    const later = setTimeout(measure, 120);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(later);
    };
  }, [current.target, measure]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure]);

  const last = step === steps.length - 1;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose(false);
      else if ((event.key === "ArrowRight" || event.key === "Enter") && last) onClose(true);
      else if (event.key === "ArrowRight" || event.key === "Enter") onStep(step + 1);
      else if (event.key === "ArrowLeft" && step > 0) onStep(step - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, last, onStep, onClose]);

  // Phone: the card sits at the top or the bottom, away from the spotlight. Wider: beside it, below if there is room.
  const phone = viewport.width > 0 && viewport.width < 768;
  const cardWidth = 340;
  let cardStyle: React.CSSProperties = {};
  if (!rect) {
    cardStyle = phone ? { left: 12, right: 12, top: "50%", transform: "translateY(-50%)" } : { width: 380, left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  } else if (!phone) {
    const below = rect.top + rect.height + 12;
    const fitsBelow = below + 230 < viewport.height;
    cardStyle = {
      width: cardWidth,
      left: Math.min(Math.max(16, rect.left), viewport.width - cardWidth - 16),
      ...(fitsBelow ? { top: below } : { bottom: Math.max(16, viewport.height - rect.top + 12) }),
    };
  } else {
    // Whichever side of the spotlight has more room (the bottom bar keeps its 84px).
    const above = rect ? rect.top : 0;
    const below = rect ? viewport.height - 84 - (rect.top + rect.height) : 1;
    cardStyle = above > below ? { left: 12, right: 12, top: 12 } : { left: 12, right: 12, bottom: 84 };
  }

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {rect ? (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-2xl ring-2 ring-brand-strong transition-all duration-300 ease-out"
          style={{ ...rect, boxShadow: "0 0 0 9999px var(--tour-dim)" }}
        />
      ) : (
        <div aria-hidden className="absolute inset-0 bg-[var(--tour-dim)]" />
      )}
      {/* Clicks on the dimmed page do nothing: the tour moves only with its own buttons. */}
      <div className="absolute inset-0" />
      <div
        key={step}
        style={cardStyle}
        className="absolute animate-[notice-in_220ms_cubic-bezier(.2,.8,.2,1)] overflow-hidden rounded-2xl border border-brand-line bg-panel shadow-[var(--shadow-dialog)]"
      >
        <div className="h-px bg-gradient-to-r from-transparent via-brand-strong/70 to-transparent" aria-hidden />
        <div className="px-5 pb-4 pt-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-semibold text-brand-strong">
              {step + 1} of {steps.length}
            </span>
            <span className="flex gap-1" aria-hidden>
              {steps.map((_, i) => (
                <span key={i} className={`h-1 rounded-full transition-all ${i === step ? "w-5 bg-brand-strong" : i < step ? "w-2 bg-brand" : "w-2 bg-border-strong"}`} />
              ))}
            </span>
            <button type="button" onClick={() => onClose(false)} aria-label="Skip the tour" className="-mr-1.5 ml-auto rounded-lg p-1 text-muted hover:bg-panel-raised hover:text-text">
              <X size={16} strokeWidth={2} />
            </button>
          </div>
          <h2 id="tour-title" className="mt-2.5 text-[16px] font-semibold tracking-[-0.01em]">
            {current.title}
          </h2>
          <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{current.body}</p>
          {current.action && (
            <Link
              href={current.action.href}
              onClick={() => onClose(true)}
              className="mt-3.5 flex items-center justify-center gap-2 rounded-xl border border-figure/45 bg-figure-soft px-4 py-2.5 text-[13.5px] font-semibold text-figure hover:border-figure"
            >
              <ShieldUser size={17} strokeWidth={2} />
              {current.action.label}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2 border-t border-border bg-panel-raised/40 px-4 py-3">
          <button type="button" onClick={() => onClose(false)} className="rounded-lg px-2 py-1.5 text-[13px] font-semibold text-muted hover:text-text">
            Skip tour
          </button>
          <div className="ml-auto flex gap-2">
            {step > 0 && (
              <button type="button" onClick={() => onStep(step - 1)} className="flex items-center gap-1.5 rounded-xl border border-border-strong px-3 py-1.5 text-[13px] font-semibold text-text hover:bg-panel-raised">
                <ArrowLeft size={15} strokeWidth={2.1} className="text-brand-strong" />
                Back
              </button>
            )}
            <button
              type="button"
              autoFocus
              onClick={() => (last ? onClose(true) : onStep(step + 1))}
              className="flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-1.5 text-[13px] font-semibold text-on-brand hover:brightness-110"
            >
              {last ? <Check size={15} strokeWidth={2.2} /> : <ArrowRight size={15} strokeWidth={2.2} />}
              {last ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
