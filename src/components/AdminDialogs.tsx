"use client";

import {
  Ban,
  Check,
  DollarSign,
  Eye,
  FileText,
  Gauge,
  Hourglass,
  KeyRound,
  Laptop,
  LogOut,
  MessageSquareText,
  Minus,
  Monitor,
  OctagonPause,
  Pause,
  Play,
  UserRound,
  FlaskConical,
  CalendarDays,
  Plus,
  RotateCcw,
  Search,
  Smartphone,
  TimerReset,
  UserRoundMinus,
  UserRoundPlus,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Dialog, keepButton } from "@/components/Dialog";
import { Field } from "@/components/Field";
import { PersonLine, RoleBadge, roleTone } from "@/components/PersonLine";
import { formatUsd, type Person, type SessionRow } from "@/lib/admin";
import { can, permissionInfo, permissions, roleLabel, type Role } from "@/lib/permissions";

/** Every staff action asks for a reason; it is stored with the action in the audit log and shown in Activity. */
function Reason({ initial }: { initial: string }) {
  const [reason, setReason] = useState(initial);
  return <Field icon={MessageSquareText} label="Reason (kept in the audit log)" type="text" placeholder="Why, in a few words" value={reason} onChange={setReason} autoComplete="off" />;
}

/** The person the action is about, with the facts that matter for this action. */
function Target({ person, facts }: { person: Person; facts: { icon: LucideIcon; tone: string; text: ReactNode }[] }) {
  return (
    <div className="rounded-xl border border-border bg-paper">
      <div className="border-b border-border px-3.5 py-3">
        <PersonLine person={person} size={34} />
      </div>
      <ul className="space-y-2 px-3.5 py-3 text-[13px]">
        {facts.map(({ icon: Icon, tone, text }, i) => (
          <li key={i} className="flex items-center gap-2.5">
            <Icon size={15} strokeWidth={2} className={`shrink-0 ${tone}`} />
            <span className="min-w-0">{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Cancel plus the confirm button. In the public demo the confirm button is replaced by a note: the dialog shows what
 * the action asks for, and nothing is sent (the server refuses writes under /demo anyway).
 */
function Actions({ demo, confirm }: { demo: boolean; confirm: { icon: LucideIcon; label: string; className: string } }) {
  const Icon = confirm.icon;
  return (
    <>
      <button type="button" className={keepButton}>
        <X size={17} strokeWidth={2} className="text-brand-strong" />
        {demo ? "Close" : "Cancel"}
      </button>
      {demo ? (
        <span className="flex items-center gap-2 rounded-xl border border-figure/40 bg-figure-soft px-4 py-2 text-[13px] font-semibold text-figure">
          <Eye size={16} strokeWidth={2} />
          Read-only demo · nothing is sent
        </span>
      ) : (
        <button type="button" className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[13.5px] font-semibold hover:brightness-110 ${confirm.className}`}>
          <Icon size={17} strokeWidth={2} />
          {confirm.label}
        </button>
      )}
    </>
  );
}

const rose = "bg-clear-strong text-white";
const gold = "bg-figure text-bg";
const indigo = "bg-brand text-on-brand";
const teal = "bg-verify text-bg";
const deviceIcon: Record<SessionRow["kind"], LucideIcon> = { desktop: Monitor, laptop: Laptop, phone: Smartphone };

export function SuspendDialog({ person, devices, summaries, demo }: { person: Person; devices: number; summaries: number; demo: boolean }) {
  return (
    <Dialog
      tone="clear"
      icon={Ban}
      title={`Suspend ${person.name}?`}
      detail="They are signed out at once and can't sign in or distill until restored. Nothing of theirs is deleted."
      actions={<Actions demo={demo} confirm={{ icon: Ban, label: "Suspend", className: rose }} />}
    >
      <Target
        person={person}
        facts={[
          { icon: LogOut, tone: "text-clear", text: `${devices} signed-in ${devices === 1 ? "device" : "devices"}, signed out now` },
          { icon: FileText, tone: "text-brand-strong", text: `${summaries} summaries kept, hidden until restored` },
        ]}
      />
      <Reason initial="Posting spam through shared links" />
    </Dialog>
  );
}

export function RestoreDialog({ person, suspendedBy, suspendedOn, suspendedFor, demo }: { person: Person; suspendedBy: Person; suspendedOn: string; suspendedFor: string; demo: boolean }) {
  return (
    <Dialog
      tone="verify"
      icon={RotateCcw}
      title={`Restore ${person.name}?`}
      detail="They can sign in and distill again, with their summaries back as they were."
      actions={<Actions demo={demo} confirm={{ icon: RotateCcw, label: "Restore", className: teal }} />}
    >
      <Target
        person={person}
        facts={[
          {
            icon: Ban,
            tone: "text-clear",
            text: (
              <>
                Suspended {suspendedOn} by <span className={roleTone[suspendedBy.role].text}>@{suspendedBy.username}</span>
              </>
            ),
          },
          { icon: MessageSquareText, tone: "text-muted", text: <span className="text-muted">{suspendedFor}</span> },
        ]}
      />
      <Reason initial="Appeal accepted; the links were removed" />
    </Dialog>
  );
}

export function SignOutDialog({ person, sessions, demo }: { person: Person; sessions: SessionRow[]; demo: boolean }) {
  return (
    <Dialog
      tone="clear"
      icon={LogOut}
      title="Sign out everywhere?"
      detail={`${person.name} is signed out on every device and has to sign in again. The account stays active.`}
      actions={<Actions demo={demo} confirm={{ icon: LogOut, label: "Sign out everywhere", className: rose }} />}
    >
      <Target
        person={person}
        facts={sessions.map((s) => ({
          icon: deviceIcon[s.kind],
          tone: "text-input",
          text: (
            <>
              {s.browser} · {s.os} <span className="font-mono text-[11.5px] text-muted">· {s.lastSeen}</span>
            </>
          ),
        }))}
      />
      <Reason initial="Lost phone, asked in support" />
    </Dialog>
  );
}

export function ResetLimitDialog({ person, used, limit, nextFree, today, demo }: { person: Person; used: number; limit: number; nextFree: string; today: string; demo: boolean }) {
  return (
    <Dialog
      tone="brand"
      icon={TimerReset}
      title="Reset the hourly limit?"
      detail={`${person.name}'s hour starts again now. The daily limit still applies.`}
      actions={<Actions demo={demo} confirm={{ icon: TimerReset, label: "Reset limit", className: indigo }} />}
    >
      <Target
        person={person}
        facts={[
          { icon: Hourglass, tone: "text-brand-strong", text: `${used} of ${limit} this hour · next frees at ${nextFree}` },
          { icon: Gauge, tone: "text-brand-strong", text: `Today ${today}` },
        ]}
      />
      <Reason initial="Preparing a client report on a deadline; asked in support" />
    </Dialog>
  );
}

/** Role chips, never a dropdown: the few roles fit on screen. */
function RolePick({ options, initial }: { options: Role[]; initial: Role }) {
  const [role, setRole] = useState(initial);
  return (
    <div>
      <span className="mb-1.5 block text-[12.5px] font-semibold text-muted">New role</span>
      <div className="flex gap-2">
        {options.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={r === role}
            onClick={() => setRole(r)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-[13px] font-semibold ${
              r === role ? roleTone[r].badge : "border-border text-muted hover:bg-panel-raised"
            }`}
          >
            {r === role && <Check size={15} strokeWidth={2.4} />}
            {roleLabel[r]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** What changes for them, read from the same permission matrix the server checks. */
function Gains({ from, to }: { from: Role; to: Role }) {
  const gained = permissions.filter((p) => can(to, p) && !can(from, p));
  const lost = permissions.filter((p) => can(from, p) && !can(to, p));
  return (
    <ul className="space-y-1.5 rounded-xl border border-border bg-paper px-3.5 py-3 text-[12.5px]">
      {gained.map((p) => (
        <li key={p} className="flex items-center gap-2 text-verify">
          <Plus size={14} strokeWidth={2.4} />
          {permissionInfo[p].label}
        </li>
      ))}
      {lost.map((p) => (
        <li key={p} className="flex items-center gap-2 text-clear">
          <Minus size={14} strokeWidth={2.4} />
          {permissionInfo[p].label}
        </li>
      ))}
    </ul>
  );
}

export function ChangeRoleDialog({ person, to, demo }: { person: Person; to: Role; demo: boolean }) {
  return (
    <Dialog
      tone="figure"
      icon={KeyRound}
      title={`Change ${person.name}'s role?`}
      detail="Takes effect on their next page. Only the owner can change roles."
      actions={<Actions demo={demo} confirm={{ icon: KeyRound, label: "Change role", className: gold }} />}
    >
      <div className="flex items-center gap-3 rounded-xl border border-border bg-paper px-3.5 py-3">
        <PersonLine person={person} size={34} />
      </div>
      <RolePick options={["admin", "moderator", "user"]} initial={to} />
      <Gains from={person.role} to={to} />
      <Reason initial="Takes over the daily server checks" />
    </Dialog>
  );
}

export function GrantRoleDialog({ person, to, demo }: { person: Person; to: Role; demo: boolean }) {
  const [query, setQuery] = useState(`@${person.username}`);
  return (
    <Dialog
      tone="figure"
      icon={UserRoundPlus}
      title="Grant a staff role"
      detail="Pick who and which role. They see the console on their next page."
      actions={<Actions demo={demo} confirm={{ icon: UserRoundPlus, label: "Grant role", className: gold }} />}
    >
      <Field icon={Search} label="Who" type="text" placeholder="@username or email" value={query} onChange={setQuery} autoComplete="off" />
      <div className="-mt-2 flex items-center gap-3 rounded-xl border border-brand-line bg-brand-soft px-3.5 py-2.5">
        <PersonLine person={person} size={30} />
        <Check size={16} strokeWidth={2.4} className="ml-auto text-brand-strong" />
      </div>
      <RolePick options={["admin", "moderator"]} initial={to} />
      <Gains from={person.role} to={to} />
      <Reason initial="Joins support for the evening hours" />
    </Dialog>
  );
}

export function RevokeDialog({ person, since, demo }: { person: Person; since: string; demo: boolean }) {
  return (
    <Dialog
      tone="clear"
      icon={UserRoundMinus}
      title={`Revoke ${person.name}'s role?`}
      detail="They become a regular user at once. Their account and summaries stay."
      actions={<Actions demo={demo} confirm={{ icon: UserRoundMinus, label: "Revoke", className: rose }} />}
    >
      <div className="flex items-center gap-3 rounded-xl border border-border bg-paper px-3.5 py-3">
        <PersonLine person={person} size={34} />
        <span className="ml-auto font-mono text-[11.5px] text-muted">since {since}</span>
      </div>
      <div className="flex items-center gap-2 text-[12.5px] text-muted">
        <RoleBadge role={person.role} />
        becomes
        <RoleBadge role="user" />
      </div>
      <Gains from={person.role} to="user" />
      <Reason initial="Stepped back from moderating" />
    </Dialog>
  );
}

export function ChangeCapDialog({
  capUsd,
  dailyCapUsd,
  workspaceCapUsd,
  monthUsd,
  todayUsd,
  projectedUsd,
  demo,
}: {
  capUsd: number;
  dailyCapUsd: number;
  workspaceCapUsd: number;
  monthUsd: number;
  todayUsd: number;
  projectedUsd: number;
  demo: boolean;
}) {
  const [value, setValue] = useState(capUsd.toFixed(2));
  const [daily, setDaily] = useState(dailyCapUsd.toFixed(2));
  const next = Number(value);
  const nextDaily = Number(daily);
  const over = !Number.isFinite(next) || next > workspaceCapUsd || next < monthUsd;
  const dailyOver = !Number.isFinite(nextDaily) || nextDaily <= 0 || nextDaily > next || nextDaily < todayUsd;
  return (
    <Dialog
      tone="figure"
      icon={Gauge}
      title="Change the caps"
      detail="At a cap, new summaries stop with a calm notice: the daily one until midnight UTC, the monthly one until the month ends."
      actions={<Actions demo={demo} confirm={{ icon: Gauge, label: "Save caps", className: gold }} />}
    >
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Spent", value: formatUsd(monthUsd), tone: "text-figure" },
          { label: "By month end", value: `~${formatUsd(projectedUsd)}`, tone: "text-figure" },
          { label: "Now", value: formatUsd(capUsd), tone: "text-brand-strong" },
        ].map((t) => (
          <div key={t.label} className="rounded-xl border border-border bg-paper px-2 py-2.5">
            <div className={`font-mono text-[16px] font-semibold ${t.tone}`}>{t.value}</div>
            <div className="mt-0.5 text-[11.5px] text-muted">{t.label}</div>
          </div>
        ))}
      </div>
      <Field icon={DollarSign} label="Monthly cap (US dollars)" type="text" placeholder="40.00" value={value} onChange={setValue} autoComplete="off" />
      <p className={`-mt-2 flex items-center gap-2 font-mono text-[11.5px] ${over ? "text-flag" : "text-verify"}`}>
        {over ? <X size={13} strokeWidth={2.4} /> : <Check size={13} strokeWidth={2.4} />}
        Between {formatUsd(monthUsd)} (spent) and {formatUsd(workspaceCapUsd)} (the Anthropic limit)
      </p>
      <Field icon={CalendarDays} label="Daily cap (US dollars)" type="text" placeholder="3.00" value={daily} onChange={setDaily} autoComplete="off" />
      <p className={`-mt-2 flex items-center gap-2 font-mono text-[11.5px] ${dailyOver ? "text-flag" : "text-verify"}`}>
        {dailyOver ? <X size={13} strokeWidth={2.4} /> : <Check size={13} strokeWidth={2.4} />}
        Up to the monthly cap; today so far {formatUsd(todayUsd)}
      </p>
      <Reason initial="More guests than expected this month" />
    </Dialog>
  );
}

const pauseInfo = {
  guests: {
    icon: UserRound,
    title: "Pause guests?",
    detail: "No new guest sessions, and guests are told summaries are paused. Accounts keep working.",
    label: "Pause guests",
  },
  all: {
    icon: FlaskConical,
    title: "Pause all summaries?",
    detail: "Every new summary is refused with a calm notice, staff included. Sign-in, Saved and the console keep working.",
    label: "Pause all",
  },
} as const;

/** What a pause does, line by line: who is affected now, what stops, what keeps working. */
export type PauseFact = { kind: "people" | "stop" | "keep"; text: string };
const factLook: Record<PauseFact["kind"], { icon: LucideIcon; tone: string }> = {
  people: { icon: UserRound, tone: "text-input" },
  stop: { icon: Ban, tone: "text-clear" },
  keep: { icon: Check, tone: "text-verify" },
};

/** Pulling a brake: what stops, what keeps going, and a reason for the audit log. */
export function PauseDialog({ kind, facts, demo }: { kind: "guests" | "all"; facts: PauseFact[]; demo: boolean }) {
  const info = pauseInfo[kind];
  const Icon = info.icon;
  return (
    <Dialog tone="clear" icon={Pause} title={info.title} detail={info.detail} actions={<Actions demo={demo} confirm={{ icon: Pause, label: info.label, className: rose }} />}>
      <ul className="space-y-2 rounded-xl border border-border bg-paper px-3.5 py-3 text-[13px]">
        <li className="flex items-center gap-2.5 font-semibold">
          <Icon size={15} strokeWidth={2} className="text-clear" />
          {kind === "guests" ? "Guests" : "All summaries"}
        </li>
        {facts.map((fact, i) => {
          const { icon: FactIcon, tone } = factLook[fact.kind];
          return (
            <li key={i} className="flex items-center gap-2.5">
              <FactIcon size={15} strokeWidth={2} className={`shrink-0 ${tone}`} />
              <span className="min-w-0">{fact.text}</span>
            </li>
          );
        })}
      </ul>
      <Reason initial={kind === "guests" ? "Guest farming from one network" : "Claude incident, waiting for it to settle"} />
    </Dialog>
  );
}

/** Releasing a brake: who pulled it, when and why, then back to running. */
export function ResumeDialog({ kind, pausedBy, pausedOn, pausedFor, demo }: { kind: "guests" | "all"; pausedBy: Person; pausedOn: string; pausedFor: string; demo: boolean }) {
  return (
    <Dialog
      tone="verify"
      icon={Play}
      title={kind === "guests" ? "Resume guests?" : "Resume all summaries?"}
      detail={kind === "guests" ? "Visitors can start guest sessions again, and guests can distill." : "Everyone can distill again, within their own limits."}
      actions={<Actions demo={demo} confirm={{ icon: Play, label: "Resume", className: teal }} />}
    >
      <ul className="space-y-2 rounded-xl border border-border bg-paper px-3.5 py-3 text-[13px]">
        <li className="flex items-center gap-2.5">
          <OctagonPause size={15} strokeWidth={2} className="shrink-0 text-brand-strong" />
          <span>
            Paused {pausedOn} by <span className={roleTone[pausedBy.role].text}>@{pausedBy.username}</span>
          </span>
        </li>
        <li className="flex items-center gap-2.5">
          <MessageSquareText size={15} strokeWidth={2} className="shrink-0 text-muted" />
          <span className="text-muted">{pausedFor}</span>
        </li>
      </ul>
    </Dialog>
  );
}
