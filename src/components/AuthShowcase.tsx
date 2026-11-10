import { ShieldCheck } from "@/components/glyphs";
import { Drop } from "@/components/still";

const lines = [
  { w: "92%", lit: false },
  { w: "84%", lit: true },
  { w: "88%", lit: true },
  { w: "60%", lit: false },
  { w: "90%", lit: false },
  { w: "78%", lit: true },
  { w: "70%", lit: false },
];

const threadY = [68, 88, 148];

/**
 * A moving still of the product on a 7 s loop: the source is read, the used sentences light up,
 * threads draw to a point, then its figures are checked. Illustration only; motion stops for
 * people who ask their system for reduced motion.
 */
export function AuthShowcase() {
  return (
    <div className="relative mt-6 h-[300px] w-[560px]" aria-hidden>
      <div className="glass absolute left-0 top-6 w-[210px] overflow-hidden rounded-2xl border border-border/70 bg-paper p-5">
        <div className="space-y-3">
          {lines.map((line, index) => (
            <span
              key={index}
              className={`block h-2 rounded-full bg-border-strong/70 ${line.lit ? "show-line" : ""}`}
              style={{ width: line.w, animationDelay: line.lit ? `${index * 0.12}s` : undefined }}
            />
          ))}
        </div>
        <span className="show-scan pointer-events-none absolute inset-x-3 top-4 h-6 rounded-md bg-gradient-to-b from-transparent via-brand-strong/15 to-transparent" />
      </div>

      <svg className="absolute inset-0 h-full w-full overflow-visible">
        {threadY.map((y, index) => (
          <path
            key={index}
            className="show-thread"
            d={`M 214 ${y} C 268 ${y}, 262 130, 300 130`}
            fill="none"
            stroke="var(--copper)"
            strokeWidth="1.8"
            style={{ animationDelay: `${index * 0.15}s` }}
          />
        ))}
      </svg>

      <div className="absolute left-[300px] top-0 w-[260px] space-y-3">
        <div className="flex gap-2">
          {["1,200", "$40M", "30%"].map((value, index) => (
            <span
              key={value}
              className="show-pop ampoule relative flex items-center gap-1 overflow-hidden rounded-2xl border border-[var(--meniscus)]/50 bg-panel-raised py-1.5 pr-2.5 pl-4 text-[14px] font-bold text-text"
              style={{ animationDelay: `${0.2 + index * 0.12}s` }}
            >
              <span className="relative z-10">{value}</span>
              <ShieldCheck size={12} strokeWidth={2.2} className="show-check relative z-10 text-verify" style={{ animationDelay: `${0.3 + index * 0.12}s` }} />
            </span>
          ))}
        </div>
        <div className="show-pop rounded-xl border border-brand-line bg-brand-soft p-4">
          <div className="flex gap-3">
            <Drop n={2} active />
            <span className="text-[13.5px] leading-relaxed text-text">A third of the homes will be affordable, paid by a $40M state grant.</span>
          </div>
          <span className="show-check ml-9 mt-2.5 inline-flex items-center gap-1.5 rounded-md border border-verify/30 bg-verify-soft px-2 py-0.5 text-[11px] font-semibold text-verify">
            <ShieldCheck size={12} strokeWidth={2.2} />2 figures checked
          </span>
        </div>
        <div className="flex gap-3 rounded-xl border border-border bg-panel p-4 opacity-60">
          <Drop n={3} />
          <span className="space-y-2 pt-1">
            <span className="block h-2 w-44 rounded-full bg-border-strong" />
            <span className="block h-2 w-32 rounded-full bg-border-strong" />
          </span>
        </div>
      </div>
    </div>
  );
}
