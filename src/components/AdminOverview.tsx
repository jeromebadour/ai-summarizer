import {
  Activity,
  ArrowUpRight,
  ChartColumn,
  CircleCheck,
  Coins,
  Cpu,
  Database,
  DatabaseBackup,
  FileText,
  HardDrive,
  Hourglass,
  LockKeyhole,
  MemoryStick,
  RadioTower,
  Server,
  TriangleExclamationPoint,
  UserRound,
  UserRoundPlus,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Fact, healthLook } from "@/components/AdminFacts";
import { activityLook } from "@/components/ActivityLook";
import { DayBars } from "@/components/DayBars";
import { PersonLine } from "@/components/PersonLine";
import { StatTile } from "@/components/StatTile";
import { formatUsd, overviewFigures, type ActivityEntry, type AdminOverview as Overview, type AttentionItem, type OverviewFigures } from "@/lib/admin";

function Attention({ items, base, serverReady }: { items: AttentionItem[]; base: string; serverReady: boolean }) {
  return (
    <section role="alert" className="flex flex-col gap-2 rounded-2xl border border-flag/40 bg-flag-soft px-5 py-3.5">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-3">
          <TriangleExclamationPoint size={18} strokeWidth={2.1} className="shrink-0 text-flag" />
          <span className="text-[13.5px] font-semibold text-flag">{item.title}</span>
          <span className="font-mono text-[12px] text-muted">{item.detail}</span>
          {serverReady && (
            <Link href={`${base}?tab=server` as never} className="ml-auto flex items-center gap-1.5 text-[12.5px] font-semibold text-flag hover:underline">
              <Server size={14} strokeWidth={2} />
              Server
            </Link>
          )}
        </div>
      ))}
    </section>
  );
}

function Chart({ icon: Icon, tone, title, total, children }: { icon: LucideIcon; tone: string; title: string; total: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-col rounded-2xl border border-border bg-panel p-4">
      <div className={`flex items-center gap-2 text-[12.5px] font-semibold ${tone}`}>
        <Icon size={16} strokeWidth={2} />
        {title}
        <span className="ml-auto font-mono text-[11.5px] font-medium text-muted">{total}</span>
      </div>
      {children}
    </div>
  );
}


function Meter({ icon: Icon, label, percent, bar }: { icon: LucideIcon; label: string; percent: number; bar: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={15} strokeWidth={2} className="shrink-0 text-muted" />
      <span className="w-16 text-[12.5px] text-muted">{label}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
        <span className={`block h-full rounded-full ${bar}`} style={{ width: `${Math.max(percent, 2)}%` }} />
      </span>
      <span className="w-10 text-right font-mono text-[12px] text-text">{percent}%</span>
    </div>
  );
}


function ServerGlance({ server, claude, base, serverReady }: { server: Overview["server"]; claude: OverviewFigures["claude"]; base: string; serverReady: boolean }) {
  const look = healthLook[server.health];
  return (
    <div className="flex min-h-0 flex-col rounded-2xl border border-border bg-panel p-4">
      <div className="flex items-center gap-2 text-[12.5px] font-semibold text-text">
        <Server size={16} strokeWidth={2} className="text-input" />
        Server
        <span className={`ml-3 flex items-center gap-1.5 ${look.tone}`}>
          <CircleCheck size={14} strokeWidth={2.2} />
          {look.label}
        </span>
        {serverReady && (
          <Link href={`${base}?tab=server` as never} className="ml-auto flex items-center gap-1 text-[12px] font-semibold text-brand-strong hover:underline">
            Details
            <ArrowUpRight size={14} strokeWidth={2} />
          </Link>
        )}
      </div>
      <div className="mt-4 flex flex-col gap-2.5">
        <Meter icon={Cpu} label="CPU" percent={server.cpu} bar={look.bar} />
        <Meter icon={MemoryStick} label="Memory" percent={server.memory} bar={look.bar} />
        <Meter icon={HardDrive} label="Disk" percent={server.disk} bar={look.bar} />
      </div>
      <div className="mt-3.5 flex flex-col gap-2.5 border-t border-border pt-3">
        <Fact icon={Database} tone="text-verify" label="Database" value={`up · ${server.database.sizeMb} MB · ${server.database.connections} connections`} />
        <Fact
          icon={RadioTower}
          tone="text-brand-strong"
          label="Claude API"
          alert={claude.failedRate >= 5}
          value={`${server.claude.avgSeconds.toFixed(1)} s avg · ${server.claude.failedToday} of ${claude.requestsToday} failed today (${claude.failedRate}%)`}
        />
        {/* Hidden until the box reports them (backups and the certificate are read there), never guessed. */}
        {server.backup && (
          <Fact icon={DatabaseBackup} tone="text-figure" label="Backup" value={`${server.backup.last} today · restore tested ${server.backup.restoreTested}`} />
        )}
        {server.httpsDays !== null && <Fact icon={LockKeyhole} tone="text-verify" label="HTTPS" value={`valid ${server.httpsDays} days · renews itself`} />}
      </div>
    </div>
  );
}


function LatestActivity({ entries, base }: { entries: ActivityEntry[]; base: string }) {
  return (
    <div className="flex min-h-0 flex-col rounded-2xl border border-border bg-panel p-4">
      <div className="flex items-center gap-2 text-[12.5px] font-semibold text-text">
        <Activity size={16} strokeWidth={2} className="text-brand-strong" />
        Latest account activity
        <Link href={`${base}?tab=activity` as never} className="ml-auto flex items-center gap-1 text-[12px] font-semibold text-brand-strong hover:underline">
          All activity
          <ArrowUpRight size={14} strokeWidth={2} />
        </Link>
      </div>
      <ul className={`mt-3 flex flex-1 flex-col ${entries.length >= 5 ? "justify-between" : ""}`}>
        {entries.slice(0, 5).map((entry) => {
          const { icon: Icon, tone, label } = activityLook[entry.kind];
          return (
            <li key={entry.id} className="grid grid-cols-[44px_230px_minmax(0,1fr)] items-center gap-3 border-b border-border py-1 last:border-b-0">
              <span className="font-mono text-[12px] text-muted">{entry.at}</span>
              <PersonLine person={entry.person} />
              <span className="flex min-w-0 items-center gap-2.5">
                <span className={`flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11.5px] font-semibold ${tone}`}>
                  <Icon size={13} strokeWidth={2.2} />
                  {label}
                </span>
                <span className="truncate font-mono text-[11.5px] text-muted">{entry.detail}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** `base` is /admin or /demo/admin, so links stay inside the console the viewer is in. */
export function AdminOverview({ overview: o, recent, base, serverReady }: { overview: Overview; recent: ActivityEntry[]; base: string; serverReady: boolean }) {
  const f = overviewFigures(o);
  return (
    <div className="flex min-h-fit flex-1 flex-col gap-4">
      {o.attention.length > 0 && <Attention items={o.attention} base={base} serverReady={serverReady} />}

      <div className="grid grid-cols-6 gap-4">
        <StatTile icon={UsersRound} tone="text-brand-strong" label="Accounts" value={String(o.users.registered)} note={`+${f.signups.today} today · +${f.signups.week} this week`} />
        <StatTile icon={UserRound} tone="text-input" label="Guests" value={String(o.guests.active)} note={`${o.guests.today} today · ${o.guests.upgradedWeek} kept theirs`} />
        <StatTile icon={Activity} tone="text-verify" label="Active now" value={String(o.active.now)} note={`${o.active.week} this week`} />
        <StatTile icon={FileText} tone="text-brand-strong" label="Summaries today" value={String(f.summaries.today)} note={`${f.summaries.week} this week`} />
        <StatTile
          icon={Coins}
          tone="text-figure"
          label="Spend this month"
          value={formatUsd(f.spend.monthUsd)}
          note={
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-12 overflow-hidden rounded-full bg-border">
                <span className="block h-full rounded-full bg-figure" style={{ width: `${f.spend.capShare}%` }} />
              </span>
              {f.spend.capShare}% of {formatUsd(o.spend.capUsd)} cap
            </span>
          }
        />
        <StatTile icon={Hourglass} tone="text-brand-strong" label="Limits reached today" value={String(o.limitsHit.today)} note={`${o.limitsHit.users} ${o.limitsHit.users === 1 ? "account" : "accounts"} · ${o.limitsHit.guests} ${o.limitsHit.guests === 1 ? "guest" : "guests"}`} />
      </div>

      {/* Extra height is shared between the charts (never under 96 px) and the row below (never under what its rows need). */}
      <div className="grid min-h-40 flex-1 grid-cols-3 gap-4">
        <Chart icon={UserRoundPlus} tone="text-input" title="Sign-ups" total={`${f.signups.fortnight} in 14 days`}>
          <DayBars values={o.daily.signups} label="Sign-ups per day" bar="bg-input/55" today="bg-input" />
        </Chart>
        <Chart icon={ChartColumn} tone="text-brand-strong" title="Summaries" total={`${f.summaries.fortnight} in 14 days`}>
          <DayBars values={o.daily.summaries} label="Summaries per day" bar="bg-brand" today="bg-brand-strong" />
        </Chart>
        <Chart icon={Coins} tone="text-figure" title="Spend" total={`${formatUsd(f.spend.weekUsd)} this week · about ${formatUsd(f.spend.projectedUsd)} by month end`}>
          <DayBars values={o.daily.spendCents} label="Claude spend per day in cents" bar="bg-figure/55" today="bg-figure" format={(c) => `${Math.round(c)}¢`} />
        </Chart>
      </div>

      <div className="grid min-h-fit flex-1 grid-cols-[1fr_1.55fr] gap-4">
        <ServerGlance server={o.server} claude={f.claude} base={base} serverReady={serverReady} />
        <LatestActivity entries={recent} base={base} />
      </div>
    </div>
  );
}
