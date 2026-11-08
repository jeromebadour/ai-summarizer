/**
 * One bar per day, oldest first, today last and brighter. Empty days are a thin line, never a gap.
 * Used by the profile's activity and the admin console's daily charts.
 */
export function DayBars({
  values,
  label,
  bar,
  today,
  format = String,
}: {
  values: number[];
  /** What one value counts, for screen readers ("Summaries per day"). */
  label: string;
  bar: string;
  today: string;
  format?: (value: number) => string;
}) {
  const peak = Math.max(1, ...values);
  const days = values.length;
  return (
    <>
      <div className="mt-4 flex min-h-0 flex-1 items-end justify-center gap-2 max-md:min-h-[150px] max-md:gap-1" role="img" aria-label={`${label} over the last ${days} days: ${values.map(format).join(", ")}`}>
        {values.map((value, index) => (
          <div key={index} className="flex h-full max-w-24 flex-1 flex-col items-center justify-end gap-1.5">
            <span className="font-mono text-[10px] text-muted">{value > 0 ? format(value) : ""}</span>
            <span
              className={`w-full rounded-md ${value > 0 ? (index === days - 1 ? today : bar) : "bg-border"}`}
              style={{ height: value > 0 ? `${(value / peak) * 85}%` : "3px" }}
            />
          </div>
        ))}
      </div>
      {days > 1 && (
        <div className="mt-2 flex justify-between font-mono text-[10.5px] text-faint">
          <span>{days - 1 === 1 ? "Yesterday" : `${days - 1} days ago`}</span>
          <span>Today</span>
        </div>
      )}
    </>
  );
}
