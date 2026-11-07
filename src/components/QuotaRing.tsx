import { Clock3 } from "lucide-react";

type QuotaRingProps = {
  used: number;
  limit: number;
  resetsAt: string;
  /** Left out for guests: their daily cap is shared by all guests, not personal. */
  dayUsed?: number;
  dayLimit?: number;
};

export function QuotaRing({ used, limit, resetsAt, dayUsed, dayLimit }: QuotaRingProps) {
  const left = limit - used;
  const radius = 17;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * (left / limit);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-panel/80 py-2 pl-2 pr-4">
      <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
        <circle cx="22" cy="22" r={radius} fill="none" stroke="var(--brand-soft)" strokeWidth="4" />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          transform="rotate(-90 22 22)"
        />
        <text x="22" y="26.5" textAnchor="middle" fill="var(--text)" fontFamily="var(--font-mono)" fontSize="12" fontWeight="600">
          {left}
        </text>
      </svg>
      <div className="leading-tight">
        <div className="text-[13px] font-semibold">
          {left} of {limit} left this hour
        </div>
        {/* No use this hour means nothing to reset: the reset time shows only once there is one. */}
        {(used > 0 || dayLimit !== undefined) && (
          <div className="mt-1 flex items-center gap-1.5 font-mono text-[11.5px] text-muted">
            {used > 0 && (
              <>
                <Clock3 size={12} strokeWidth={2} />
                resets {resetsAt}
              </>
            )}
            {used > 0 && dayLimit !== undefined && " · "}
            {dayLimit !== undefined && `today ${dayUsed ?? 0}/${dayLimit}`}
          </div>
        )}
      </div>
    </div>
  );
}
