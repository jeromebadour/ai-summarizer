import {
  ArrowLeft,
  Ban,
  CalendarDays,
  ChartColumn,
  Coins,
  FileText,
  Hourglass,
  KeyRound,
  Laptop,
  LogOut,
  Mail,
  Monitor,
  RotateCcw,
  ShieldCheck,
  ShieldUser,
  Smartphone,
  TimerReset,
  TriangleExclamationPoint,
  type LucideIcon,
} from "lucide-react";
import Link from "@/components/NavLink";
import { Avatar } from "@/components/Avatar";
import { DayBars } from "@/components/DayBars";
import { PersonLine, RoleBadge, roleTone } from "@/components/PersonLine";
import { RowNumber } from "@/components/RowNumber";
import { StatTile } from "@/components/StatTile";
import { formatCost, type UserDetail } from "@/lib/admin";
import { can, outranks, type Role } from "@/lib/permissions";

const deviceIcon: Record<UserDetail["sessions"][number]["kind"], LucideIcon> = { desktop: Monitor, laptop: Laptop, phone: Smartphone };

/** Opens the action's dialog (named in the URL, so it can be linked and refreshed). */
function Action({ href, icon: Icon, label, tone }: { href: string; icon: LucideIcon; label: string; tone: string }) {
  return (
    <Link href={href as never} scroll={false} className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[13px] font-semibold ${tone}`}>
      <Icon size={17} strokeWidth={2} />
      {label}
    </Link>
  );
}

function Panel({ icon: Icon, tone, title, aside, grow = false, children }: { icon: LucideIcon; tone: string; title: string; aside?: React.ReactNode; grow?: boolean; children: React.ReactNode }) {
  return (
    <section className={`flex min-h-0 flex-col rounded-2xl border border-border bg-panel p-4 ${grow ? "flex-1" : ""}`}>
      <div className="flex items-center gap-2 text-[12.5px] font-semibold text-text">
        <Icon size={16} strokeWidth={2} className={tone} />
        {title}
        {aside && <span className="ml-auto font-mono text-[11.5px] font-medium text-muted">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

/** One user as staff see them. Actions show only when the viewer's role holds them; each opens a dialog with a reason. */
export function AdminUserDetail({ detail: d, viewer, base }: { detail: UserDetail; viewer: Role; base: string }) {
  const { person } = d.row;
  const guest = person.role === "guest";
  const days = Math.max(1, Math.min(14, d.accountDays));
  const daily = d.daily.slice(-days);
  const suspended = d.row.status === "suspended";
  // Staff act only on people below their role: never on their own page, never on the owner (the database agrees).
  const actable = outranks(viewer, person.role);
  const open = (dialog: string, extra = "") => `${base}?tab=users&user=${person.username}&dialog=${dialog}${extra}`;
  // A staff member's role changes in the role dialog; a user's role is granted (guests and suspended users get none).
  const roleHref = person.role === "user" ? open("grant", `&who=${person.username}`) : open("role", `&who=${person.username}`);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <section className="relative flex items-center gap-6 overflow-hidden rounded-2xl border border-border bg-panel px-6 py-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-strong/50 to-transparent" aria-hidden />
        <Link href={`${base}?tab=users` as never} className="flex items-center gap-1.5 self-start rounded-lg border border-border px-2.5 py-1.5 text-[12.5px] font-semibold text-muted hover:border-brand-line hover:text-text">
          <ArrowLeft size={15} strokeWidth={2.1} className="text-brand-strong" />
          Users
        </Link>
        {guest ? (
          <PersonLine person={person} size={64} />
        ) : (
          <div className="flex items-center gap-5">
            <Avatar name={person.name} colour={person.avatarColour} size={64} />
            <div>
              <div className="flex items-center gap-3">
                <h2 className={`text-[22px] font-semibold tracking-[-0.01em] ${roleTone[person.role].text}`}>{person.name}</h2>
                <RoleBadge role={person.role} />
                {suspended && (
                  <span className="flex items-center gap-1.5 rounded-md border border-clear/40 bg-clear-soft px-2 py-0.5 text-[11.5px] font-semibold text-clear">
                    <Ban size={12.5} strokeWidth={2.2} />
                    Suspended
                  </span>
                )}
              </div>
              <div className="mt-0.5 font-mono text-[12.5px] text-brand-strong">@{person.username}</div>
              <div className="mt-2 flex items-center gap-5 text-[12.5px] text-muted">
                {d.row.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail size={14} strokeWidth={2} className="text-input" />
                    {d.row.email}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={14} strokeWidth={2} className="text-input" />
                  Joined {d.row.joined}
                </span>
                <span className={`flex items-center gap-1.5 ${d.row.lastActive.recency === "now" ? "text-verify" : ""}`}>
                  <ChartColumn size={14} strokeWidth={2} className="text-brand-strong" />
                  Last active {d.row.lastActive.label}
                </span>
              </div>
            </div>
          </div>
        )}
        {/* Only the actions the viewer's role holds, and only those that would change something. */}
        {actable && (
          <div className="ml-auto flex items-center gap-2 self-start">
            {can(viewer, "users.resetLimit") && d.hour.used > 0 && (
              <Action href={open("reset")} icon={TimerReset} label="Reset limit" tone="border-brand-line text-brand-strong hover:bg-brand-soft" />
            )}
            {can(viewer, "roles.change") && !guest && !(suspended && person.role === "user") && (
              <Action href={roleHref} icon={KeyRound} label="Change role" tone="border-figure/40 text-figure hover:bg-figure-soft" />
            )}
            {can(viewer, "users.signOut") && d.sessions.length > 0 && (
              <Action href={open("signout")} icon={LogOut} label="Sign out everywhere" tone="border-clear/40 text-clear hover:bg-clear-soft" />
            )}
            {can(viewer, "users.suspend") &&
              (suspended ? (
                <Action href={open("restore")} icon={RotateCcw} label="Restore" tone="border-verify/40 text-verify hover:bg-verify-soft" />
              ) : (
                <Action href={open("suspend")} icon={Ban} label="Suspend" tone="border-clear/50 bg-clear-soft text-clear hover:border-clear" />
              ))}
          </div>
        )}
      </section>

      <div className={`grid ${d.row.costUsd === null ? "grid-cols-3" : "grid-cols-4"} gap-5`}>
        <StatTile icon={FileText} tone="text-brand-strong" label="Summaries" value={String(d.row.summaries)} note={`${daily.at(-1) ?? 0} today`} />
        {d.row.costUsd !== null && <StatTile icon={Coins} tone="text-figure" label="Spend" value={formatCost(d.row.costUsd)} note="all time" />}
        <StatTile
          icon={Hourglass}
          tone="text-brand-strong"
          label="This hour"
          value={`${d.hour.used} of ${d.hour.limit}`}
          note={
            d.hour.resetBy ? (
              <span>
                reset by <span className={roleTone[d.hour.resetBy.person.role].text}>@{d.hour.resetBy.person.username}</span> at {d.hour.resetBy.at}
              </span>
            ) : d.hour.resetsAt ? (
              `next frees at ${d.hour.resetsAt}${d.day ? ` · today ${d.day.used} of ${d.day.limit}` : ""}`
            ) : d.day ? (
              `today ${d.day.used} of ${d.day.limit}`
            ) : (
              "guest limit"
            )
          }
        />
        <StatTile
          icon={ShieldCheck}
          tone="text-verify"
          label="Figures flagged"
          value={String(d.flagged)}
          note={
            d.flagged > 0 ? (
              <span className="flex items-center gap-1.5 text-flag">
                <TriangleExclamationPoint size={12} strokeWidth={2.2} />
                {d.flagged === 1 ? "1 summary" : `${d.flagged} summaries`}
              </span>
            ) : (
              "none"
            )
          }
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1.2fr_1fr] gap-4">
        <Panel icon={ChartColumn} tone="text-brand-strong" title={days === 1 ? "Today" : `Last ${days} days`} aside={`${daily.reduce((s, n) => s + n, 0)} summaries`}>
          <DayBars values={daily} label="Summaries per day" bar="bg-brand" today="bg-brand-strong" />
        </Panel>

        <div className="flex min-h-0 flex-col gap-4">
          <Panel icon={Monitor} tone="text-input" title="Signed in on" aside={`${d.sessions.length} ${d.sessions.length === 1 ? "device" : "devices"}`}>
            <ul className="mt-3 flex flex-col">
              {d.sessions.map((s, i) => {
                const Icon = deviceIcon[s.kind];
                return (
                  <li key={s.id} className="grid grid-cols-[20px_28px_minmax(0,1fr)_auto] items-center gap-3 border-b border-border py-2 last:border-b-0">
                    <RowNumber n={i + 1} />
                    <span className="grid size-7 place-items-center rounded-lg border border-input/30 bg-input-soft text-input">
                      <Icon size={15} strokeWidth={2} />
                    </span>
                    <span className="min-w-0 leading-tight">
                      <span className="block truncate text-[13px] font-semibold">
                        {s.os ? `${s.browser} · ${s.os}` : s.browser}
                      </span>
                      <span className="font-mono text-[11px] text-muted">{s.place}</span>
                    </span>
                    <span className="font-mono text-[11.5px] text-brand-strong">{s.lastSeen}</span>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel grow icon={ShieldUser} tone="text-figure" title="Staff actions" aside={d.staffActions.length > 0 ? `${d.staffActions.length}` : undefined}>
            {d.staffActions.length === 0 ? (
              <p className="mt-3 flex items-center gap-2 text-[12.5px] text-muted">
                <ShieldCheck size={15} strokeWidth={2} className="text-verify" />
                No staff actions on this account.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col">
                {d.staffActions.map((a, i) => (
                  <li key={a.id} className="grid grid-cols-[20px_minmax(0,1fr)] gap-3 border-b border-border py-2 last:border-b-0">
                    <RowNumber n={i + 1} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <PersonLine person={a.actor} size={26} />
                        <span className="ml-auto font-mono text-[11.5px] text-muted">{a.at}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 text-[12.5px]">
                        <span className="flex items-center gap-1.5 rounded-md border border-figure/35 bg-figure-soft px-2 py-0.5 text-[11.5px] font-semibold text-figure">
                          <TimerReset size={12.5} strokeWidth={2.2} />
                          {a.action}
                        </span>
                        <span className="truncate text-muted">{a.reason}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
