import { Clock3 } from "@/components/glyphs";
import { QuotaFlask } from "@/components/still";

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

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-panel/80 py-2 pl-2 pr-4 max-md:gap-2 max-md:py-1 max-md:pl-1 max-md:pr-3">
      <QuotaFlask left={left} limit={limit} />
      <div className="leading-tight">
        <div className="text-[13px] font-semibold">
          {left} of {limit} left<span className="max-md:hidden"> this hour</span>
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
            {used > 0 && dayLimit !== undefined && <span className={used > 0 ? "max-md:hidden" : undefined}> · </span>}
            {dayLimit !== undefined && <span className={used > 0 ? "max-md:hidden" : undefined}>today {dayUsed ?? 0}/{dayLimit}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
