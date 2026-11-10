import { Binary, Calculator, ChartColumn, Coins, FlaskConical, Gauge, OctagonPause, Pause, Pencil, Play, UserRound, UsersRound, type GlyphIcon } from "@/components/glyphs";
import Link from "@/components/NavLink";
import type { SpendRow } from "@/lib/admin-source";
import { DayBars } from "@/components/DayBars";
import { Pager } from "@/components/Pager";
import { PhoneScroll } from "@/components/PhoneScroll";
import { PersonLine } from "@/components/PersonLine";
import { RowNumber, RowNumberHead } from "@/components/RowNumber";
import { StatTile } from "@/components/StatTile";
import { roleTone } from "@/components/PersonLine";
import { claudePrice, formatCost, formatUsd, overviewFigures, whenLabel, type AdminOverview, type Pause as PauseState } from "@/lib/admin";
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
  canPause,
  base,
}: {
  overview: AdminOverview;
  /** This month's spenders, one page of them. */
  rows: SpendRow[];
  page: Page;
  monthLabel: string;
  canChangeCap: boolean;
  /** Owners and admins: the two brakes. Nobody else sees the switches (the state still shows in the header). */
  canPause: boolean;
  base: string;
}) {
  const f = overviewFigures(overview);
  const { capUsd, workspaceCapUsd } = overview.spend;
  const monthSummaries = overview.daily.summaries.slice(-7).reduce((s, n) => s + n, 0);
  const at = (usd: number) => `${Math.min(100, (usd / workspaceCapUsd) * 100)}%`;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className={`grid gap-4 max-md:!grid-cols-1 max-md:gap-3 ${canPause ? "grid-cols-[2.6fr_1fr_1.75fr]" : "grid-cols-[2fr_1fr_1fr]"}`}>
        <section className="rounded-2xl border border-border bg-panel p-4">
          <div className="flex items-center gap-2 max-md:flex-wrap text-[12.5px] font-semibold text-figure">
            <Gauge size={16} strokeWidth={2} />
            Spend this month
            <span className="font-mono text-[11.5px] font-medium text-muted">
              {monthLabel}
            </span>
            {canChangeCap && (
              <Link href={`${base}?tab=spend&dialog=cap`} className="ml-auto flex items-center gap-1.5 rounded-lg border border-figure/40 px-2.5 py-1 text-[12px] font-semibold text-figure hover:bg-figure-soft">
                <Pencil size={13} strokeWidth={2.1} />
                Change caps
              </Link>
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
              <span className="text-figure">{f.spend.capShare}%</span> of cap
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-figure/30" />
              projected
            </span>
            <span className="ml-auto flex items-center gap-1.5">
              <span className="h-2.5 w-0.5 rounded bg-brand-strong" />
              <span className="text-brand-strong">app cap {formatUsd(capUsd)}</span>
            </span>
            <span>Anthropic {formatUsd(workspaceCapUsd)}</span>
          </div>
        </section>
        <StatTile
          icon={Coins}
          tone="text-figure"
          label="Today"
          value={formatCost(f.spend.todayUsd)}
          note={
            <>
              of <span className="text-figure">{formatUsd(overview.spend.dailyCapUsd)}</span> a day · {f.summaries.today} summaries ·{" "}
              {formatCost(f.spend.monthUsd / Math.max(1, monthSummaries))} each
            </>
          }
        />
        {canPause ? (
          <section className="flex flex-col gap-2.5 rounded-2xl border border-border bg-panel p-4">
            <div className="flex items-center gap-2 px-1 text-[12.5px] font-semibold text-clear">
              <OctagonPause size={16} strokeWidth={2} />
              Brakes
            </div>
            <Brake
              icon={UserRound}
              tone="text-input"
              title="Guests"
              facts={`${overview.guests.active} active · ${overview.guests.today} new today`}
              pause={overview.pauses.guests}
              today={overview.today}
              pauseHref={`${base}?tab=spend&dialog=pause-guests`}
              resumeHref={`${base}?tab=spend&dialog=resume-guests`}
              pauseLabel="Pause"
            />
            <Brake
              icon={FlaskConical}
              tone="text-brand-strong"
              title="All summaries"
              facts={`${f.summaries.today} today · staff included`}
              pause={overview.pauses.all}
              today={overview.today}
              pauseHref={`${base}?tab=spend&dialog=pause-all`}
              resumeHref={`${base}?tab=spend&dialog=resume-all`}
              pauseLabel="Pause"
            />
          </section>
        ) : (
          <StatTile
            icon={Calculator}
            tone="text-brand-strong"
            label="Per summary"
            value={formatCost(f.spend.monthUsd / Math.max(1, monthSummaries))}
            note={`at $${claudePrice.inputPerMillion.toFixed(2)} / $${claudePrice.outputPerMillion.toFixed(2)} per M tokens`}
          />
        )}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_1.7fr] gap-4 max-md:grid-cols-1 max-md:gap-3">
        <section className="flex min-h-0 flex-col rounded-2xl border border-border bg-panel p-4">
          <div className="flex items-center gap-2 max-md:flex-wrap text-[12.5px] font-semibold text-figure">
            <ChartColumn size={16} strokeWidth={2} />
            Per day
            <span className="ml-auto font-mono text-[11.5px] font-medium text-muted">
              {formatUsd(overview.daily.spendCents.reduce((s, c) => s + c, 0) / 100)} in 14 days · ${claudePrice.inputPerMillion.toFixed(2)} / $
              {claudePrice.outputPerMillion.toFixed(2)} per M tokens
            </span>
          </div>
          <DayBars values={overview.daily.spendCents} label="Claude spend per day in cents" bar="bg-figure/55" today="bg-figure" format={(c) => `${Math.round(c)}¢`} />
        </section>

        <section className="flex min-h-0 flex-col gap-3 rounded-2xl border border-border bg-panel p-4">
          <div className="flex items-center gap-2 max-md:flex-wrap text-[12.5px] font-semibold text-text">
            <UsersRound size={16} strokeWidth={2} className="text-brand-strong" />
            Per person this month
            <span className="ml-auto font-mono text-[11.5px] font-medium text-muted">most first</span>
          </div>
          <PhoneScroll minWidth="max-md:min-w-[760px]">
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
          </PhoneScroll>
          <Pager page={page} noun="people" href={(n) => (n === 1 ? `${base}?tab=spend` : `${base}?tab=spend&page=${n}`)} />
        </section>
      </div>
    </div>
  );
}

/**
 * One brake. Running is the normal state (teal "Running", a rose Pause button). Pulled, it is a chosen state, not a
 * problem: calm indigo with since when, by whom and why, and a teal Resume.
 */
function Brake({
  icon: Icon,
  tone,
  title,
  facts,
  pause,
  today,
  pauseHref,
  resumeHref,
  pauseLabel,
}: {
  icon: GlyphIcon;
  tone: string;
  title: string;
  facts: string;
  pause: PauseState | null;
  today: string;
  pauseHref: string;
  resumeHref: string;
  pauseLabel: string;
}) {
  return (
    <section
      className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${pause ? "border-brand-line bg-brand-soft/60" : "border-border bg-panel-raised/30"}`}
    >
      <span className={`grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-panel-raised/60 ${tone}`}>
        <Icon size={16} strokeWidth={1.9} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <h3 className="text-[13.5px] font-semibold">{title}</h3>
          {pause ? (
            <span className="flex items-center gap-1.5 rounded-md border border-brand-line bg-brand-soft px-2 py-0.5 text-[11.5px] font-semibold text-brand-strong">
              <OctagonPause size={12} strokeWidth={2.3} />
              Paused
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-md border border-verify/30 bg-verify-soft px-2 py-0.5 text-[11.5px] font-semibold text-verify">
              <span className="size-1.5 rounded-full bg-verify" />
              Running
            </span>
          )}
        </div>
        {pause ? (
          <p className="mt-0.5 truncate text-[11.5px] text-muted">
            {whenLabel(pause.since, today)} by <span className={`font-semibold ${roleTone[pause.by.role].text}`}>@{pause.by.username}</span>
            <span className="text-faint"> · </span>
            {pause.reason}
          </p>
        ) : (
          <p className="mt-0.5 truncate font-mono text-[11px] text-muted">{facts}</p>
        )}
      </div>
      {pause ? (
        <Link href={resumeHref} className="flex shrink-0 items-center gap-1.5 rounded-lg border border-verify/40 bg-verify-soft py-1.5 pl-2.5 pr-3 text-[12.5px] font-semibold text-verify hover:border-verify/70">
          <Play size={14} strokeWidth={2.2} />
          Resume
        </Link>
      ) : (
        <Link href={pauseHref} className="flex shrink-0 items-center gap-1.5 rounded-lg border border-clear/35 py-1.5 pl-2.5 pr-3 text-[12.5px] font-semibold text-clear hover:bg-clear-soft">
          <Pause size={14} strokeWidth={2.2} />
          {pauseLabel}
        </Link>
      )}
    </section>
  );
}
