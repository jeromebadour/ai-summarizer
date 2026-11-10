"use client";

import {
  Ban,
  Check,
  DollarSign,
  FileText,
  Gauge,
  Hourglass,
  KeyRound,
  LoaderCircle,
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
  type GlyphIcon,
} from "@/components/glyphs";
import { useRef, useState, type ReactNode } from "react";
import { Field } from "@/components/Field";
import { StaffForm, type StaffProps } from "@/components/StaffForm";
import { PersonLine, RoleBadge, roleTone } from "@/components/PersonLine";
import { formatUsd, type Person, type SessionRow } from "@/lib/admin";
import { can, permissionInfo, permissions, roleLabel, type Role } from "@/lib/permissions";

/** The person the action is about, with the facts that matter for this action. */
function Target({ person, facts }: { person: Person; facts: { icon: GlyphIcon; tone: string; text: ReactNode }[] }) {
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

const rose = "bg-clear-strong text-white";
const gold = "bg-figure text-bg";
const indigo = "bg-brand text-on-brand";
const teal = "bg-verify text-bg";
const deviceIcon: Record<SessionRow["kind"], GlyphIcon> = { desktop: Monitor, laptop: Laptop, phone: Smartphone };

export function SuspendDialog({ person, devices, summaries, staff }: { person: Person; devices: number; summaries: number; staff: StaffProps }) {
  return (
    <StaffForm
      staff={staff}
      kind="suspend"
      fields={{ user: person.username }}
      tone="clear"
      icon={Ban}
      title={`Suspend ${person.name}?`}
      detail="They are signed out at once and can't sign in or distill until restored. Nothing of theirs is deleted."
      confirm={{ icon: Ban, label: "Suspend", pending: "Suspending", className: rose }}
      example="Posting spam through shared links"
    >
      <Target
        person={person}
        facts={[
          { icon: LogOut, tone: "text-clear", text: `${devices} signed-in ${devices === 1 ? "device" : "devices"}, signed out now` },
          { icon: FileText, tone: "text-brand-strong", text: `${summaries} summaries kept, hidden until restored` },
        ]}
      />
    </StaffForm>
  );
}

export function RestoreDialog({ person, suspendedBy, suspendedOn, suspendedFor, staff }: { person: Person; suspendedBy: Person | null; suspendedOn: string; suspendedFor: string; staff: StaffProps }) {
  return (
    <StaffForm
      staff={staff}
      kind="restore"
      fields={{ user: person.username }}
      tone="verify"
      icon={RotateCcw}
      title={`Restore ${person.name}?`}
      detail="They can sign in and distill again, with their summaries back as they were."
      confirm={{ icon: RotateCcw, label: "Restore", pending: "Restoring", className: teal }}
      example="Appeal accepted; the links were removed"
    >
      <Target
        person={person}
        facts={[
          {
            icon: Ban,
            tone: "text-clear",
            text: suspendedBy ? (
              <>
                Suspended {suspendedOn} by <span className={roleTone[suspendedBy.role].text}>@{suspendedBy.username}</span>
              </>
            ) : (
              `Suspended ${suspendedOn}`
            ),
          },
          { icon: MessageSquareText, tone: "text-muted", text: <span className="text-muted">{suspendedFor}</span> },
        ]}
      />
    </StaffForm>
  );
}

export function SignOutDialog({ person, sessions, staff }: { person: Person; sessions: SessionRow[]; staff: StaffProps }) {
  return (
    <StaffForm
      staff={staff}
      kind="signout"
      fields={{ user: person.username }}
      tone="clear"
      icon={LogOut}
      title="Sign out everywhere?"
      detail={`${person.name} is signed out on every device and has to sign in again. The account stays active.`}
      confirm={{ icon: LogOut, label: "Sign out everywhere", pending: "Signing out", className: rose }}
      example="Lost phone, asked in support"
    >
      <Target
        person={person}
        facts={sessions.map((s) => ({
          icon: deviceIcon[s.kind],
          tone: "text-input",
          text: (
            <>
              {s.os ? `${s.browser} · ${s.os}` : s.browser} <span className="font-mono text-[11.5px] text-muted">· {s.lastSeen}</span>
            </>
          ),
        }))}
      />
    </StaffForm>
  );
}

export function ResetLimitDialog({ person, used, limit, nextFree, today, staff }: { person: Person; used: number; limit: number; nextFree: string; today: string; staff: StaffProps }) {
  return (
    <StaffForm
      staff={staff}
      kind="reset"
      fields={{ user: person.username }}
      tone="brand"
      icon={TimerReset}
      title="Reset the hourly limit?"
      detail={`${person.name}'s hour starts again now. The daily limit still applies.`}
      confirm={{ icon: TimerReset, label: "Reset limit", pending: "Resetting", className: indigo }}
      example="Preparing a client report on a deadline; asked in support"
    >
      <Target
        person={person}
        facts={[
          { icon: Hourglass, tone: "text-brand-strong", text: `${used} of ${limit} this hour · next frees at ${nextFree}` },
          { icon: Gauge, tone: "text-brand-strong", text: `Today ${today}` },
        ]}
      />
    </StaffForm>
  );
}

/** Role chips, never a dropdown: the few roles fit on screen. */
function RolePick({ options, value, onChange }: { options: Role[]; value: Role; onChange: (role: Role) => void }) {
  return (
    <div>
      <span className="mb-1.5 block text-[12.5px] font-semibold text-muted">New role</span>
      <div className="flex gap-2">
        {options.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={r === value}
            onClick={() => onChange(r)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-[13px] font-semibold ${
              r === value ? roleTone[r].badge : "border-border text-muted hover:bg-panel-raised"
            }`}
          >
            {r === value && <Check size={15} strokeWidth={2.4} />}
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
  if (gained.length + lost.length === 0) return null;
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

/** A staff member to another role (or back to User). Opens on the role they hold; confirm waits for a change. */
export function ChangeRoleDialog({ person, to, staff }: { person: Person; to: Role; staff: StaffProps }) {
  const [role, setRole] = useState<Role>(to);
  return (
    <StaffForm
      staff={staff}
      kind="role"
      fields={{ user: person.username, from: person.role, role }}
      ready={role !== person.role}
      tone="figure"
      icon={KeyRound}
      title={`Change ${person.name}'s role?`}
      detail="Takes effect on their next page. Only the owner can change roles."
      confirm={{ icon: KeyRound, label: "Change role", pending: "Changing role", className: gold }}
      example="Takes over the daily server checks"
    >
      <div className="flex items-center gap-3 rounded-xl border border-border bg-paper px-3.5 py-3">
        <PersonLine person={person} size={34} />
      </div>
      <RolePick options={["admin", "moderator", "user"]} value={role} onChange={setRole} />
      <Gains from={person.role} to={role} />
    </StaffForm>
  );
}

export type FindAccount = (query: string) => Promise<(Person & { suspended: boolean }) | null>;

/** Who the Grant dialog found, and whether they can take a staff role. */
type Found = { person: Person; suspended: boolean } | "none" | null;

/**
 * Grant a staff role to an account. Live, the owner looks the account up by @username or email (the database finds
 * it; guests are never found); opened from someone's page, it starts with them.
 */
export function GrantRoleDialog({ person, to, staff, find }: { person: Person | null; to: Role; staff: StaffProps; find?: FindAccount }) {
  const [query, setQuery] = useState(person ? `@${person.username}` : "");
  const [found, setFound] = useState<Found>(person ? { person, suspended: false } : null);
  const [looking, setLooking] = useState(false);
  const [role, setRole] = useState<Role>(to);
  const seq = useRef(0);

  function search(value: string) {
    setQuery(value);
    if (!find) return;
    const n = ++seq.current;
    if (value.trim().replace(/^@/, "").length < 3) {
      setFound(null);
      return;
    }
    setLooking(true);
    setTimeout(async () => {
      if (n !== seq.current) return;
      const hit = await find(value).catch(() => null);
      if (n !== seq.current) return;
      setLooking(false);
      setFound(hit ? { person: hit, suspended: hit.suspended } : "none");
    }, 300);
  }

  const target = found && found !== "none" ? found : null;
  const problem = target?.suspended ? "Suspended: restore them first" : target && target.person.role !== "user" ? `Already ${roleLabel[target.person.role]}: change it from their page` : null;
  return (
    <StaffForm
      staff={staff}
      kind="role"
      fields={{ user: target?.person.username ?? "", from: "user", role }}
      ready={Boolean(target) && !problem}
      tone="figure"
      icon={UserRoundPlus}
      title="Grant a staff role"
      detail="Pick who and which role. They see the console on their next page."
      confirm={{ icon: UserRoundPlus, label: "Grant role", pending: "Granting", className: gold }}
      example="Joins support for the evening hours"
    >
      <Field icon={Search} label="Who" type="text" placeholder="@username or email" value={query} onChange={search} autoComplete="off" />
      {looking ? (
        <p className="-mt-2 flex items-center gap-2 px-1 font-mono text-[11.5px] text-brand-strong">
          <LoaderCircle size={13} strokeWidth={2.2} className="animate-spin" />
          Looking for the account
        </p>
      ) : found === "none" ? (
        <p className="-mt-2 flex items-center gap-2 px-1 font-mono text-[11.5px] text-muted">
          <X size={13} strokeWidth={2.4} />
          No account by that @username or email
        </p>
      ) : (
        target && (
          <div className={`-mt-2 flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${problem ? "border-border bg-paper" : "border-brand-line bg-brand-soft"}`}>
            <PersonLine person={target.person} size={30} />
            {problem ? (
              <span className="ml-auto text-[12px] font-semibold text-muted">{problem}</span>
            ) : (
              <Check size={16} strokeWidth={2.4} className="ml-auto text-brand-strong" />
            )}
          </div>
        )
      )}
      <RolePick options={["admin", "moderator"]} value={role} onChange={setRole} />
      <Gains from="user" to={role} />
    </StaffForm>
  );
}

export function RevokeDialog({ person, since, staff }: { person: Person; since: string; staff: StaffProps }) {
  return (
    <StaffForm
      staff={staff}
      kind="role"
      fields={{ user: person.username, from: person.role, role: "user" }}
      tone="clear"
      icon={UserRoundMinus}
      title={`Revoke ${person.name}'s role?`}
      detail="They become a regular user at once. Their account and summaries stay."
      confirm={{ icon: UserRoundMinus, label: "Revoke", pending: "Revoking", className: rose }}
      example="Stepped back from moderating"
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
    </StaffForm>
  );
}

export function ChangeCapDialog({
  capUsd,
  dailyCapUsd,
  workspaceCapUsd,
  monthUsd,
  todayUsd,
  projectedUsd,
  staff,
}: {
  capUsd: number;
  dailyCapUsd: number;
  workspaceCapUsd: number;
  monthUsd: number;
  todayUsd: number;
  projectedUsd: number;
  staff: StaffProps;
}) {
  const [value, setValue] = useState(capUsd.toFixed(2));
  const [daily, setDaily] = useState(dailyCapUsd.toFixed(2));
  const next = Number(value.trim().replace(/^\$/, ""));
  const nextDaily = Number(daily.trim().replace(/^\$/, ""));
  const over = !value.trim() || !Number.isFinite(next) || next > workspaceCapUsd || next < monthUsd;
  const dailyOver = !daily.trim() || !Number.isFinite(nextDaily) || nextDaily <= 0 || nextDaily > next || nextDaily < todayUsd;
  return (
    <StaffForm
      staff={staff}
      kind="cap"
      ready={!over && !dailyOver && (next !== capUsd || nextDaily !== dailyCapUsd)}
      tone="figure"
      icon={Gauge}
      title="Change the caps"
      detail="At a cap, new summaries stop with a calm notice: the daily one until midnight UTC, the monthly one until the month ends."
      confirm={{ icon: Gauge, label: "Save caps", pending: "Saving caps", className: gold }}
      example="More guests than expected this month"
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
      <Field icon={DollarSign} label="Monthly cap (US dollars)" name="monthly" type="text" placeholder="40.00" value={value} onChange={setValue} autoComplete="off" />
      <p className={`-mt-2 flex items-center gap-2 font-mono text-[11.5px] ${over ? "text-flag" : "text-verify"}`}>
        {over ? <X size={13} strokeWidth={2.4} /> : <Check size={13} strokeWidth={2.4} />}
        Between {formatUsd(monthUsd)} (spent) and {formatUsd(workspaceCapUsd)} (the Anthropic limit)
      </p>
      <Field icon={CalendarDays} label="Daily cap (US dollars)" name="daily" type="text" placeholder="3.00" value={daily} onChange={setDaily} autoComplete="off" />
      <p className={`-mt-2 flex items-center gap-2 font-mono text-[11.5px] ${dailyOver ? "text-flag" : "text-verify"}`}>
        {dailyOver ? <X size={13} strokeWidth={2.4} /> : <Check size={13} strokeWidth={2.4} />}
        Up to the monthly cap; today so far {formatUsd(todayUsd)}
      </p>
    </StaffForm>
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
const factLook: Record<PauseFact["kind"], { icon: GlyphIcon; tone: string }> = {
  people: { icon: UserRound, tone: "text-input" },
  stop: { icon: Ban, tone: "text-clear" },
  keep: { icon: Check, tone: "text-verify" },
};

/** Pulling a brake: what stops, what keeps going, and a reason for the audit log. */
export function PauseDialog({ kind, facts, staff }: { kind: "guests" | "all"; facts: PauseFact[]; staff: StaffProps }) {
  const info = pauseInfo[kind];
  const Icon = info.icon;
  return (
    <StaffForm
      staff={staff}
      kind={`pause-${kind}`}
      tone="clear"
      icon={Pause}
      title={info.title}
      detail={info.detail}
      confirm={{ icon: Pause, label: info.label, pending: "Pausing", className: rose }}
      example={kind === "guests" ? "Guest farming from one network" : "Claude incident, waiting for it to settle"}
    >
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
    </StaffForm>
  );
}

/** Releasing a brake: who pulled it, when and why, then back to running (with a reason too, like every staff action). */
export function ResumeDialog({ kind, pausedBy, pausedOn, pausedFor, staff }: { kind: "guests" | "all"; pausedBy: Person; pausedOn: string; pausedFor: string; staff: StaffProps }) {
  return (
    <StaffForm
      staff={staff}
      kind={`resume-${kind}`}
      tone="verify"
      icon={Play}
      title={kind === "guests" ? "Resume guests?" : "Resume all summaries?"}
      detail={kind === "guests" ? "Visitors can start guest sessions again, and guests can distill." : "Everyone can distill again, within their own limits."}
      confirm={{ icon: Play, label: "Resume", pending: "Resuming", className: teal }}
      example={kind === "guests" ? "The farming stopped; blocked that network" : "Claude is answering normally again"}
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
    </StaffForm>
  );
}
