import { MapPin } from "lucide-react";
import Link from "next/link";
import { ActivityChip, activityLook } from "@/components/ActivityLook";
import { AdminSearch } from "@/components/AdminSearch";
import { Pager } from "@/components/Pager";
import { activityHref, type ActivityFilters } from "@/lib/admin-source";
import { PersonLine } from "@/components/PersonLine";
import { RowNumber, RowNumberHead } from "@/components/RowNumber";
import { whenLabel, type ActivityEntry, type ActivityKind } from "@/lib/admin";
import type { Page } from "@/lib/paging";

const columns = "grid-cols-[32px_118px_minmax(0,1.15fr)_190px_minmax(0,1.5fr)_130px]";

export const activityKinds: ActivityKind[] = ["signup", "guest", "upgrade", "signin", "signinFailed", "summary", "delete", "staff"];

/** Who did what, newest first, 15 a page. Metadata only: never what anyone pasted or got back. */
export function AdminActivity({
  rows,
  page,
  counts,
  filters,
  today,
  base,
}: {
  rows: ActivityEntry[];
  page: Page;
  counts: Record<ActivityKind, number>;
  filters: ActivityFilters;
  /** The viewer's date ("2026-11-07"), so today's rows show just the time. */
  today: string;
  base: string;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3 rounded-2xl border border-border bg-panel p-5">
      <div className="flex items-center gap-3">
        <AdminSearch name="who" value={filters.who} hrefBase={activityHref(base, { ...filters, who: "" })} placeholder="Search @username" width="w-[260px]" />
        <div className="flex flex-wrap gap-1.5">
          {activityKinds.map((kind) => {
            const { icon: Icon, tone, label } = activityLook[kind];
            const on = filters.kinds.includes(kind);
            const kinds = on ? filters.kinds.filter((k) => k !== kind) : [...filters.kinds, kind];
            return (
              <Link
                key={kind}
                href={activityHref(base, { ...filters, kinds }) as never}
                aria-pressed={on}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold ${on ? tone : `border-border ${tone.split(" ").find((c) => c.startsWith("text-"))} hover:bg-panel-raised`}`}
              >
                <Icon size={13.5} strokeWidth={2.1} />
                {label}
                <span className="font-mono text-[10.5px] font-medium opacity-75">{counts[kind]}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className={`grid ${columns} gap-4 border-b border-border px-3 pb-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-faint`}>
        <RowNumberHead />
        <span>When</span>
        <span>Who</span>
        <span>What</span>
        <span>Details</span>
        <span>From</span>
      </div>

      <ul className="-mt-1 flex min-h-0 flex-1 flex-col">
        {rows.map((entry, index) => (
          <li key={entry.id} className={`grid ${columns} items-center gap-4 rounded-lg px-3 py-[3px] hover:bg-brand-soft`}>
            <RowNumber n={page.offset + index + 1} />
            <span className={`font-mono text-[11.5px] ${entry.when.startsWith(today) ? "text-brand-strong" : "text-input"}`}>{whenLabel(entry.when, today)}</span>
            <PersonLine person={entry.person} size={28} nobody={entry.kind === "delete" ? "Deleted account" : "Not signed in"} />
            <span>
              <ActivityChip kind={entry.kind} />
            </span>
            <span className="truncate font-mono text-[11.5px] text-muted">{entry.detail}</span>
            <span className="flex items-center gap-1.5 truncate text-[12px] text-muted">
              {entry.place && <MapPin size={13} strokeWidth={2} className="shrink-0 text-input" />}
              {entry.place}
            </span>
          </li>
        ))}
      </ul>

      <Pager page={page} noun="events" href={(n) => activityHref(base, filters, n)} />
    </section>
  );
}
