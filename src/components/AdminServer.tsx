import {
  ArrowUpRight,
  Ban,
  BrickWall,
  CalendarClock,
  CircleCheck,
  Clock3,
  CloudUpload,
  Cpu,
  Database,
  DatabaseBackup,
  Gauge,
  GitCommitHorizontal,
  HardDrive,
  Layers,
  LockKeyhole,
  MapPin,
  MemoryStick,
  Package,
  RadioTower,
  RefreshCw,
  Server,
  ShieldCheck,
  Timer,
  TriangleExclamationPoint,
  type LucideIcon,
} from "lucide-react";
import Link from "@/components/NavLink";
import { Fact, healthLook } from "@/components/AdminFacts";
import { Sparkline } from "@/components/Sparkline";
import { overviewFigures, type AdminOverview } from "@/lib/admin";

function Card({ icon: Icon, tone, title, aside, children }: { icon: LucideIcon; tone: string; title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex min-h-0 flex-col rounded-2xl border border-border bg-panel p-4">
      <div className="flex items-center gap-2 text-[12.5px] font-semibold text-text">
        <Icon size={16} strokeWidth={2} className={tone} />
        {title}
        {aside && <span className="ml-auto">{aside}</span>}
      </div>
      <div className="mt-3 flex flex-1 flex-col justify-around gap-2">{children}</div>
    </section>
  );
}

/** The line is scaled to its own 48-hour range so its shape reads; the range is printed so the scale stays honest. */
function Metric({ icon: Icon, label, value, note, values, span, unit = "%", digits = 0, tone }: { icon: LucideIcon; label: string; value: string; note: string; values: number[]; span: string; unit?: string; digits?: number; tone: string }) {
  // A line needs two hours of readings; before that the card shows the reading alone.
  const line = values.length >= 2;
  const low = line ? Math.min(...values) : 0;
  const high = line ? Math.max(...values) : 0;
  const pad = Math.max((high - low) * 0.25, high * 0.02);
  const range = `${low.toFixed(digits)}–${high.toFixed(digits)}${unit}`;
  return (
    <section className="flex min-h-0 flex-col rounded-2xl border border-border bg-panel p-4">
      <div className={`flex items-center gap-2 text-[12.5px] font-semibold ${tone}`}>
        <Icon size={16} strokeWidth={2} />
        {label}
        {line && <span className="ml-auto font-mono text-[11px] font-medium text-muted">{span} · {range}</span>}
      </div>
      <div className="mt-1.5 flex items-baseline gap-2.5">
        <span className="font-mono text-[24px] font-semibold tracking-tight text-text">{value}</span>
        <span className="font-mono text-[11.5px] text-muted">{note}</span>
      </div>
      {line && (
        <div className={`mt-2 min-h-8 flex-1 ${tone}`}>
          <Sparkline values={values} min={Math.max(0, low - pad)} max={high + pad} fill label={`${label} over the last ${span}, between ${range}`} />
        </div>
      )}
    </section>
  );
}

/** The box itself: health, the four resources over 48 hours, and what runs on it. Metadata only. */
export function AdminServer({ overview, base }: { overview: AdminOverview; base: string }) {
  const s = overview.server;
  const look = healthLook[s.health];
  const claude = overviewFigures(overview).claude;
  const memoryUsed = (s.host.memoryGb * s.memory) / 100;
  const diskUsed = Math.round((s.host.diskGb * s.disk) / 100);
  const failing = claude.failedRate >= 5;
  const x = s.security;
  // Hidden means hidden: no Security card until the box has read at least one of its lines.
  const security = x.sshPasswordOff !== null || x.firewallPorts !== null || x.bannedNow !== null || x.updatesPending !== null || x.httpsUntil !== null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <section className="flex items-center gap-6 rounded-2xl border border-border bg-panel px-6 py-4">
        <span className={`flex items-center gap-2 text-[15px] font-semibold ${look.tone}`}>
          <CircleCheck size={19} strokeWidth={2.1} />
          {look.label}
        </span>
        <span className="flex items-center gap-1.5 text-[12.5px] text-muted">
          <Server size={14} strokeWidth={2} className="text-input" />
          {s.host.os} · kernel {s.host.kernel}
        </span>
        <span className="flex items-center gap-1.5 text-[12.5px] text-muted">
          <Layers size={14} strokeWidth={2} className="text-input" />
          {s.host.cpus} vCPU · {s.host.memoryGb} GB memory · {s.host.diskGb} GB disk
        </span>
        <span className="flex items-center gap-1.5 text-[12.5px] text-muted">
          <MapPin size={14} strokeWidth={2} className="text-input" />
          {s.host.region}
        </span>
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[12px] text-muted">
          <Clock3 size={14} strokeWidth={2} className="text-verify" />
          up {s.host.uptime}
        </span>
      </section>

      {/* The four lines take the height that is left (never under 7.5 rem); the rows below keep what they need. */}
      <div className="grid min-h-30 flex-1 grid-cols-4 gap-4">
        <Metric icon={Cpu} tone="text-verify" label="CPU" value={`${s.cpu}%`} note={`of ${s.host.cpus} vCPU`} values={s.series.cpu} span={s.seriesSpan} />
        <Metric icon={Gauge} tone="text-verify" label="Load" value={s.load.toFixed(2)} note={`${s.host.cpus} cores = full`} values={s.series.load} span={s.seriesSpan} unit="" digits={2} />
        <Metric icon={MemoryStick} tone="text-input" label="Memory" value={`${s.memory}%`} note={`${memoryUsed.toFixed(1)} of ${s.host.memoryGb} GB`} values={s.series.memory} span={s.seriesSpan} />
        <Metric icon={HardDrive} tone="text-figure" label="Disk" value={`${s.disk}%`} note={`${diskUsed} of ${s.host.diskGb} GB`} values={s.series.disk} span={s.seriesSpan} digits={1} />
      </div>

      <div className={`grid shrink-0 gap-4 ${!s.backup && security ? "grid-cols-4" : "grid-cols-3"}`}>
        <Card icon={Database} tone="text-verify" title="Database" aside={<span className="font-mono text-[11.5px] font-medium text-verify">PostgreSQL · up</span>}>
          <Fact icon={Database} tone="text-verify" label="Size" value={`${s.database.sizeMb} MB`} />
          <Fact icon={Layers} tone="text-brand-strong" label="Largest table" value={`${s.database.largestTable.name} · ${s.database.largestTable.sizeMb} MB`} />
          <Fact icon={RadioTower} tone="text-input" label="Connections" value={`${s.database.connections} of ${s.database.maxConnections}`} />
        </Card>
        <Card
          icon={RadioTower}
          tone={failing ? "text-flag" : "text-brand-strong"}
          title="Claude API"
          aside={
            <Link href={`${base}?tab=spend` as never} className="flex items-center gap-1 text-[12px] font-semibold text-brand-strong hover:underline">
              Spend
              <ArrowUpRight size={14} strokeWidth={2} />
            </Link>
          }
        >
          <Fact icon={Timer} tone="text-brand-strong" label="Response time" value={claude.requestsToday === 0 ? "no requests today" : `${s.claude.avgSeconds.toFixed(1)} s avg · ${s.claude.p95Seconds.toFixed(1)} s slowest 5%`} alert={failing} />
          <Fact icon={TriangleExclamationPoint} tone="text-brand-strong" label="Failed today" value={`${s.claude.failedToday} of ${claude.requestsToday} (${claude.failedRate}%)`} alert={failing} />
          <Fact icon={Clock3} tone="text-brand-strong" label="Last failure" value={s.claude.lastFailure ? `${s.claude.lastFailure.at} · ${s.claude.lastFailure.code}` : "none today"} alert={failing} />
        </Card>
        <Card icon={Package} tone="text-input" title="App">
          <Fact icon={GitCommitHorizontal} tone="text-input" label="Build" value={s.app.commit} />
          <Fact icon={CloudUpload} tone="text-input" label="Deployed" value={s.app.deployedAt} />
          <Fact icon={Layers} tone="text-input" label="Runs on" value={`Next.js ${s.app.next} · Node ${s.app.node}`} />
        </Card>
        {!s.backup && security && <SecurityCard security={s.security} />}
      </div>

      {/* Backups appear once they run on the box; until then Security joins the row above. */}
      {s.backup ? (
        <div className="grid shrink-0 grid-cols-[1.25fr_1fr] gap-4">
          <BackupsCard backup={s.backup} />
          {security && <SecurityCard security={s.security} />}
        </div>
      ) : null}
    </div>
  );
}

type ServerFacts = AdminOverview["server"];

function BackupsCard({ backup }: { backup: NonNullable<ServerFacts["backup"]> }) {
  return (
    <Card icon={DatabaseBackup} tone="text-figure" title="Backups" aside={<span className="font-mono text-[11.5px] font-medium text-muted">{backup.target}</span>}>
      <div className="grid flex-1 grid-cols-[1fr_1fr] gap-8">
        <div className="flex flex-col justify-around gap-2">
          <Fact icon={DatabaseBackup} tone="text-figure" label="Last backup" value={`${backup.last} today`} />
          <Fact icon={CalendarClock} tone="text-figure" label="Next" value={backup.next} />
          <Fact icon={RefreshCw} tone="text-verify" label="Restore tested" value={`${backup.restoreTested} · ${backup.restoreSeconds} s`} />
          <Fact icon={HardDrive} tone="text-figure" label="Kept" value={`last ${backup.keepDays} days`} />
        </div>
        <ul className="flex flex-col justify-around gap-1.5 border-l border-border pl-8">
          {backup.recent.map((b) => (
            <li key={b.id} className={`flex items-center gap-2 rounded-lg border px-3 py-1 font-mono text-[11.5px] ${b.ok ? "border-verify/30 bg-verify-soft text-verify" : "border-flag/40 bg-flag-soft text-flag"}`}>
              {b.ok ? <CircleCheck size={13} strokeWidth={2.2} /> : <TriangleExclamationPoint size={13} strokeWidth={2.2} />}
              {b.at}
              <span className="ml-auto text-muted">{b.sizeMb} MB</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

/** Only what the box could read; a line it couldn't is left out, never guessed. */
function SecurityCard({ security: x }: { security: ServerFacts["security"] }) {
  return (
    <Card icon={ShieldCheck} tone="text-verify" title="Security">
      {x.sshPasswordOff !== null && (
        <Fact icon={LockKeyhole} tone="text-verify" label="Sign-in to the box" value={x.sshPasswordOff ? "SSH key only · passwords off" : "passwords allowed"} alert={!x.sshPasswordOff} />
      )}
      {x.firewallPorts && <Fact icon={BrickWall} tone="text-verify" label="Firewall" value={`open: ${x.firewallPorts.join(", ")}`} />}
      {x.bannedNow !== null && <Fact icon={Ban} tone="text-clear" label="Blocked addresses" value={`${x.bannedNow} now${x.bannedToday !== null ? ` · ${x.bannedToday} today` : ""}`} />}
      {x.updatesPending !== null && (
        <Fact icon={RefreshCw} tone="text-verify" label="Security updates" value={x.updatesPending === 0 ? "none pending · automatic" : `${x.updatesPending} pending`} alert={x.updatesPending > 0} />
      )}
      {x.httpsUntil && <Fact icon={LockKeyhole} tone="text-verify" label="HTTPS" value={`valid until ${x.httpsUntil} · renews itself`} />}
    </Card>
  );
}
