/**
 * A small line of recent samples, oldest left, now on the right (marked with a dot).
 * Colour comes from the parent's text colour, so the line carries the same meaning as its label.
 */
/** `fill`: as tall as its box allows (a card that gives the line whatever height is left), never under 2 rem. */
export function Sparkline({ values, min = 0, max, label, fill = false }: { values: number[]; min?: number; max?: number; label: string; fill?: boolean }) {
  const width = 300;
  const height = 44;
  const top = max ?? Math.max(...values) * 1.15;
  const step = width / (values.length - 1);
  const span = Math.max(top - min, 1e-9);
  const y = (v: number) => height - 3 - ((Math.min(Math.max(v, min), top) - min) / span) * (height - 6);
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const nowY = (y(values[values.length - 1]) / height) * 100;
  return (
    <div className={`relative w-full ${fill ? "h-full min-h-8" : "h-11"}`} role="img" aria-label={label}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        <polygon points={`0,${height} ${points} ${width},${height}`} fill="currentColor" opacity="0.12" />
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
      <span className="absolute right-0 size-[7px] -translate-y-1/2 translate-x-1/2 rounded-full bg-current" style={{ top: `${nowY}%` }} aria-hidden />
    </div>
  );
}
