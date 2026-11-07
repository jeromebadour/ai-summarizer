import { Binary, Calculator, ChartColumn, Coins, Gauge, Pencil, UsersRound } from "lucide-react";
import type { SpendRow } from "@/components/AdminShell";
import { DayBars } from "@/components/DayBars";
import { Pager } from "@/components/Pager";
import { PersonLine } from "@/components/PersonLine";
import { RowNumber, RowNumberHead } from "@/components/RowNumber";
import { StatTile } from "@/components/StatTile";
import { claudePrice, formatCost, formatUsd, overviewFigures, type AdminOverview } from "@/lib/admin";
import type { Page } from "@/lib/paging";

const columns = "grid-cols-[28px_minmax(0,1fr)_78px_128px_74px_70px_96px]";
const tokens = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

/** The month's Claude spend: against both caps, per day, and per person (15 a page). Amounts only, never text. */
export function AdminSpend({
  overview,
  rows,
  page,
  monthLabel,
  canChangeCap,
  base,
}: {
  overview: AdminOverview;
  /** This month's spenders, one page of them. */
  rows: SpendRow[];
  page: Page;
  monthLabel: string;
  canChangeCap: boolean;
  base: string;
}) {
  const f = overviewFigures(overview);
  const { capUsd, workspaceCapUsd } = overview.spend;
  const monthSummaries = overview.daily.summaries.slice(-7).reduce((s, n) => s + n, 0);
  const at = (usd: number) => `${Math.min(100, (usd / workspaceCapUsd) * 100)}%`;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="grid grid-cols-[2fr_1fr_1fr] gap-5">
        <section className="rounded-2xl border border-border bg-panel p-5">
          <div className="flex items-center gap-2 text-[12.5px] font-semibold text-figure">
            <Gauge size={16} strokeWidth={2} />
            Spend this month
            <span className="font-mono text-[11.5px] font-medium text-muted">{monthLabel}</span>
            {canChangeCap && (
              <button type="button" className="ml-auto flex items-center gap-1.5 rounded-lg border border-figure/40 px-2.5 py-1 text-[12px] font-semibold text-figure hover:bg-figure-soft">
                <Pencil size={13} strokeWidth={2.1} />
                Change cap
              </button>
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="font-mono text-[30px] font-semibold tracking-tight">{formatUsd(f.spend.monthUsd)}</span>
            <span className="font-mono text-[12px] text-muted">
              about <span className="text-figure">{formatUsd(f.spend.projectedUsd)}</span> by month end
            </span>
          </div>
          {/* One scale up to the Anthropic workspace limit: spent, projected, the app's cap, the hard stop. */}
          <div className="relative mt-3 h-2.5 rounded-full bg-border">
            <span className="absolute inset-y-0 left-0 rounded-full bg-figure/25" style={{ width: at(f.spend.projectedUsd) }} />
            <span className="absolute inset-y-0 left-0 rounded-full bg-figure" style={{ width: at(f.spend.monthUsd) }} />
            <span className="absolute -inset-y-1 w-0.5 rounded bg-brand-strong" style={{ left: at(capUsd) }} />
          </div>
          <div className="mt-2 flex items-center gap-4 font-mono text-[11px] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-figure" />
              <span className="text-figure">{f.spend.capShare}%</span> of the app cap
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-figure/30" />
              projected
            </span>
            <span className="ml-auto flex items-center gap-1.5">
              <span className="h-2.5 w-0.5 rounded bg-brand-strong" />
              <span className="text-brand-strong">app cap {formatUsd(capUsd)}</span>
            </span>
            <span>Anthropic limit {formatUsd(workspaceCapUsd)} (end of bar)</span>
          </div>
        </section>
        <StatTile icon={Coins} tone="text-figure" label="Today" value={formatCost(f.spend.todayUsd)} note={`${f.summaries.today} summaries`} />
        <StatTile
          icon={Calculator}
          tone="text-brand-strong"
          label="Per summary"
          value={formatCost(f.spend.monthUsd / Math.max(1, monthSummaries))}
          note={`at $${claudePrice.inputPerMillion} / $${claudePrice.outputPerMillion} per M tokens`}
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_1.7fr] gap-5">
        <section className="flex min-h-0 flex-col rounded-2xl border border-border bg-panel p-5">
          <div className="flex items-center gap-2 text-[12.5px] font-semibold text-figure">
            <ChartColumn size={16} strokeWidth={2} />
            Per day
            <span className="ml-auto font-mono text-[11.5px] font-medium text-muted">{formatUsd(overview.daily.spendCents.reduce((s, c) => s + c, 0) / 100)} in 14 days</span>
          </div>
          <DayBars values={overview.daily.spendCents} label="Claude spend per day in cents" bar="bg-figure/55" today="bg-figure" format={(c) => `${Math.round(c)}¢`} />
        </section>

        <section className="flex min-h-0 flex-col gap-3 rounded-2xl border border-border bg-panel p-5">
          <div className="flex items-center gap-2 text-[12.5px] font-semibold text-text">
            <UsersRound size={16} strokeWidth={2} className="text-brand-strong" />
            Per person this month
            <span className="ml-auto font-mono text-[11.5px] font-medium text-muted">most first</span>
          </div>
          <div className={`grid ${columns} gap-3 border-b border-border px-2 pb-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-faint`}>
            <RowNumberHead />
            <span>Who</span>
            <span className="text-right">Summaries</span>
            <span className="text-right">Tokens in · out</span>
            <span className="text-right">Each</span>
            <span className="text-right">Cost</span>
            <span>Share</span>
          </div>
          <ul className="-mt-1 flex min-h-0 flex-1 flex-col">
            {rows.map((r, index) => {
              const share = (r.costUsd / Math.max(f.spend.monthUsd, 1e-9)) * 100;
              return (
                <li key={r.person.id} className={`grid ${columns} items-center gap-3 rounded-lg px-2 py-[2px] hover:bg-brand-soft`}>
                  <RowNumber n={page.offset + index + 1} />
                  <PersonLine person={r.person} size={24} inline />
                  <span className="text-right font-mono text-[12px] text-brand-strong">{r.summaries}</span>
                  <span className="flex items-center justify-end gap-1.5 font-mono text-[11.5px] text-input">
                    <Binary size={12} strokeWidth={2} />
                    {tokens(r.inputTokens)} · {tokens(r.outputTokens)}
                  </span>
                  <span className="text-right font-mono text-[11.5px] text-muted">{formatCost(r.costUsd / r.summaries)}</span>
                  <span className="text-right font-mono text-[12px] text-figure">{formatCost(r.costUsd)}</span>
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                      <span className="block h-full rounded-full bg-figure" style={{ width: `${Math.max(share, 2)}%` }} />
                    </span>
                    <span className="w-9 text-right font-mono text-[10.5px] text-muted">{share.toFixed(1)}%</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <Pager page={page} noun="people" href={(n) => (n === 1 ? `${base}?tab=spend` : `${base}?tab=spend&page=${n}`)} />
        </section>
      </div>
    </div>
  );
}
