import { useId } from "react";

/**
 * Pieces of Distill's world (BUILD-RULES 2.27, "Still") that only this product has. Shared, so every screen draws them
 * the same way.
 */

/** A point's number set in a drop of glass; the point being read is filled with cobalt. */
export function Drop({ n, active = false }: { n: number | string; active?: boolean }) {
  const id = useId();
  return (
    <span className="relative mt-[-2px] grid h-[30px] w-[26px] shrink-0 place-items-center" aria-hidden={false}>
      <svg width="26" height="30" viewBox="0 0 28 32" className="absolute inset-0" aria-hidden>
        <defs>
          <radialGradient id={id} cx="38%" cy="45%" r="70%">
            <stop offset="0" stopColor="#8aa6f0" />
            <stop offset="1" stopColor="#3656b8" />
          </radialGradient>
        </defs>
        <path
          d="M14 1.5C19 8 24 13 24 19.5a10 10 0 0 1-20 0C4 13 9 8 14 1.5z"
          fill={active ? `url(#${id})` : "var(--brand-soft)"}
          stroke={active ? "none" : "var(--brand-line)"}
          strokeWidth="1.3"
        />
        <path d="M8.5 19a5.5 5.5 0 0 0 3 5" fill="none" stroke="rgba(220,232,255,0.45)" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
      <span className={`relative pt-[9px] font-mono text-[11.5px] font-bold ${active ? "text-on-brand" : "text-brand-strong"}`}>{n}</span>
    </span>
  );
}

/**
 * The still, drawn in copper line in a far corner: a flame under the pot, vapour in the neck, the worm coiling through
 * its tub, one drop at a time into the receiver. Atmosphere only: it sits behind everything, never under text people
 * read (the screens that show it leave that corner empty), and it holds still when motion is reduced.
 */
export function StillArt({ className = "" }: { className?: string }) {
  return (
    <div className={`still-art pointer-events-none fixed right-[22px] bottom-[6px] -z-10 max-md:hidden ${className}`} aria-hidden>
      {/* Sized to the window's height, so on a short laptop window it stays clear of the composer. */}
      <svg
        viewBox="0 0 560 520"
        style={{ height: "clamp(160px, calc(100vh - 470px), 400px)", width: "auto", opacity: 0.62, maskImage: "linear-gradient(to left, black 60%, transparent)" }}
      >
        <g fill="none" stroke="var(--copper)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity="0.8">
          <path d="M62 470h196v34H62zM62 482h196" />
          <path d="M120 504v-8h80v8" opacity="0.6" />
          <path d="M88 466c-26-40-22-104 22-128 18-10 26-22 27-40h36c1 18 9 30 27 40 44 24 48 88 22 128z" />
          <path d="M96 404c40 12 108 12 148 0" opacity="0.6" />
          <path d="M137 298h36M139 298v-24M171 298v-24" />
          <path d="M126 274c-14-30 6-60 29-60s43 30 29 60z" />
          <path d="M155 214v-26M151 188h8" />
          <circle cx="155" cy="206" r="3" />
          <path d="M180 228c44-8 96 2 148 44M184 242c42-8 90 2 140 40" />
          <path d="M318 262h124v200H318z" />
          <path d="M318 280h124" opacity="0.5" />
          <path
            d="M326 296c30-10 78-10 108 0M326 296c34 12 74 18 108 22M434 318c-34 10-74 10-108 0M326 318c34 12 74 18 108 22M434 340c-34 10-74 10-108 0M326 340c34 12 74 18 108 22M434 362c-34 10-74 10-108 0M326 362c34 12 74 18 108 22M434 384c-34 10-74 10-108 0"
            opacity="0.55"
          />
          <path d="M326 384v40h116" opacity="0.4" />
          <path d="M442 436h40v8" />
          <path d="M474 482v-14h18v14l20 34h-58z" />
        </g>
        <g fill="var(--copper)" opacity="0.5">
          {[100, 124, 148, 172, 196, 220].map((x) => (
            <circle key={x} cx={x} cy={404 + Math.abs(160 - x) / 14} r="1.3" />
          ))}
        </g>
        <path d="M459 508h48l4 8h-56z" fill="var(--brand)" opacity="0.55" />
        <g className="still-flame" fill="var(--brand)" opacity="0.7">
          <path d="M140 482c4-8 8-10 8-16 4 6 6 10 4 16z" />
          <path d="M162 482c4-10 9-12 9-20 5 8 7 13 4 20z" />
          <path d="M186 482c3-7 7-9 7-14 4 5 5 9 3 14z" />
        </g>
        <circle className="still-drop" cx="482" cy="450" r="3.2" fill="#8aa6f0" />
        <g fill="var(--brand-strong)" opacity="0.35">
          <circle className="still-vapour" cx="200" cy="232" r="2" />
          <circle className="still-vapour still-v2" cx="240" cy="236" r="1.6" />
          <circle className="still-vapour still-v3" cx="280" cy="250" r="1.3" />
        </g>
      </svg>
    </div>
  );
}

/**
 * A reduction: the source as a full tube of glass, the summary as the same tube holding only what was kept. Used for
 * every "shorter" reading, so the measure looks the same in the result, Saved and the console.
 */
export function Reduction({ ratio, thick = false }: { ratio: number; thick?: boolean }) {
  const h = thick ? "h-2" : "h-1.5";
  return (
    <span className="block" aria-hidden>
      <span className={`tube block ${h}`}>
        <span className="tube-liquid tube-source block h-full" style={{ width: "100%" }} />
      </span>
      <span className={`tube mt-1 block ${h}`}>
        <span className="tube-liquid block h-full" style={{ width: `${Math.max(ratio * 100, 3)}%` }} />
      </span>
    </span>
  );
}

/**
 * The hour's uses as a flask of liquid: full at the start of the hour, lower with each summary, the number left on the
 * glass. Shown on every signed-in screen.
 */
export function QuotaFlask({ left, limit }: { left: number; limit: number }) {
  const clip = useId();
  const glass = useId();
  const level = limit > 0 ? Math.max(0, Math.min(1, left / limit)) : 0;
  // The body is a circle from y 14.5 to 40.5; the liquid rises from its foot.
  const top = 40.5 - 26 * level;
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden className="max-md:size-9">
      <defs>
        <clipPath id={clip}>
          <circle cx="22" cy="27.5" r="12.2" />
        </clipPath>
        <linearGradient id={glass} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6d8ce0" />
          <stop offset="1" stopColor="#2f4fae" />
        </linearGradient>
      </defs>
      <rect x="0" y={top} width="44" height="44" fill={`url(#${glass})`} clipPath={`url(#${clip})`} />
      <path d={`M9 ${top}h26`} stroke="var(--meniscus)" strokeWidth="1.2" clipPath={`url(#${clip})`} />
      <path d="M18.5 3.5h7M19.5 3.5v9.6a13 13 0 1 0 5 0V3.5" fill="none" stroke="var(--brand-line)" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M13.5 24a9 9 0 0 1 3-4.5" fill="none" stroke="var(--glass-lip)" strokeWidth="1.6" strokeLinecap="round" />
      <text x="22" y="31.5" textAnchor="middle" fill="#ffffff" fontFamily="var(--font-mono)" fontSize="11.5" fontWeight="700" paintOrder="stroke" stroke="#1d2f66" strokeWidth="2.5">
        {left}
      </text>
    </svg>
  );
}
