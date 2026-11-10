import { useId } from "react";

/**
 * Distill's mark (BUILD-RULES 2.27, world "Still"): the still's copper swan neck delivering one drop of cobalt glass,
 * over the three narrowing lines the mark always had. One drawing for the rail, sign-in, the pages and the favicon.
 */
export function BrandMark({ size = 40, glow = false }: { size?: number; glow?: boolean }) {
  const glass = useId();
  return (
    <span
      className={`grid shrink-0 place-items-center ${glow ? "drop-shadow-[0_0_14px_var(--glow)]" : ""}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg width={size} height={size} viewBox="0 0 40 40">
        <defs>
          <radialGradient id={glass} cx="36%" cy="50%" r="75%">
            <stop offset="0" stopColor="#9db5f5" />
            <stop offset="0.55" stopColor="#4d70d4" />
            <stop offset="1" stopColor="#2a4499" />
          </radialGradient>
        </defs>
        <rect x="0.5" y="0.5" width="39" height="39" rx="12" fill="#101a2b" stroke="#2d3f63" />
        <path d="M6.5 13.5c4-6 13-7.5 18-3.5 2.2 1.8 2.6 3.6 2.6 5.5" fill="none" stroke="#c58a62" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M27.1 18.2c3.6 4.6 5.4 7 5.4 9.6a5.4 5.4 0 0 1-10.8 0c0-2.6 1.8-5 5.4-9.6z" fill={`url(#${glass})`} />
        <path d="M24.4 27.6a2.8 2.8 0 0 0 1.6 2.6" fill="none" stroke="#e8eeff" strokeWidth="1.3" strokeLinecap="round" opacity="0.8" />
        <path d="M7 33.5h10M9 29.5h6" stroke="#6d8ce0" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </span>
  );
}
