"use client";

import { useRef, useState } from "react";

const LENGTH = 6;

/**
 * The emailed code, one box a digit. Typing moves on, Backspace moves back, and pasting the whole code (from the email's
 * code box) fills every box at once. The form receives it as one `code` field.
 */
export function CodeEntry({ onComplete }: { onComplete?: (code: string) => void }) {
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  const fill = (from: number, typed: string) => {
    const clean = typed.replace(/\D/g, "").slice(0, LENGTH - from);
    if (!clean) return;
    const next = [...digits];
    clean.split("").forEach((d, i) => (next[from + i] = d));
    setDigits(next);
    boxes.current[Math.min(from + clean.length, LENGTH - 1)]?.focus();
    if (next.every(Boolean)) onComplete?.(next.join(""));
  };

  return (
    <div>
      <span className="mb-1.5 block text-[12.5px] font-semibold text-muted">Code from the email</span>
      <input type="hidden" name="code" value={digits.join("")} />
      <div className="flex gap-2" onPaste={(e) => (e.preventDefault(), fill(0, e.clipboardData.getData("text")))}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              boxes.current[i] = el;
            }}
            value={d}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            aria-label={`Digit ${i + 1} of ${LENGTH}`}
            maxLength={LENGTH}
            onChange={(e) => (e.target.value ? fill(i, e.target.value) : setDigits(digits.map((x, j) => (j === i ? "" : x))))}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !d && i > 0) boxes.current[i - 1]?.focus();
            }}
            className={`h-14 w-full min-w-0 rounded-xl border bg-paper text-center font-mono text-[22px] font-semibold text-text outline-none focus:border-brand-line ${
              d ? "border-brand-line" : "border-border-strong"
            } ${i === 2 ? "mr-2" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}
