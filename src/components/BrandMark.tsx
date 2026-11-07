/** Distill's mark: three bars narrowing to a point, on the brand tile. One drawing for the rail, sign-in and the pages. */
export function BrandMark({ size = 40, glow = false }: { size?: number; glow?: boolean }) {
  const icon = Math.round(size / 2);
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-xl bg-brand ${glow ? "shadow-[0_0_24px_var(--glow)]" : ""}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg width={icon} height={icon} viewBox="0 0 22 22">
        <rect x="2" y="3" width="18" height="3.2" rx="1.6" fill="var(--on-brand)" />
        <rect x="5" y="9.4" width="12" height="3.2" rx="1.6" fill="var(--on-brand)" />
        <rect x="8" y="15.8" width="6" height="3.2" rx="1.6" fill="var(--on-brand)" />
      </svg>
    </span>
  );
}
