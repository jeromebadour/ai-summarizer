import { Coins, Eye, KeyRound, LayoutDashboard, OctagonPause, ScrollText, Server, ShieldUser, UsersRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminActivity } from "@/components/AdminActivity";
import { AdminOverview } from "@/components/AdminOverview";
import { ChangeCapDialog, ChangeRoleDialog, GrantRoleDialog, PauseDialog, ResetLimitDialog, RestoreDialog, ResumeDialog, RevokeDialog, SignOutDialog, SuspendDialog, type FindAccount } from "@/components/AdminDialogs";
import { AdminRoles } from "@/components/AdminRoles";
import { AdminServer } from "@/components/AdminServer";
import { AdminSpend } from "@/components/AdminSpend";
import { AdminUserDetail } from "@/components/AdminUserDetail";
import { AdminUsers } from "@/components/AdminUsers";
import { PageTabs, type PageTab } from "@/components/PageTabs";
import { StatusPill, type AppStatus } from "@/components/StatusPill";
import { overviewFigures, whenLabel, type AdminOverview as Overview } from "@/lib/admin";
import { activityFiltersFrom, userFiltersFrom, type AdminSource } from "@/lib/admin-source";
import { can, outranks, type Permission, type Role } from "@/lib/permissions";
import type { StaffAct, StaffProps } from "@/components/StaffForm";
import type { Account } from "@/lib/profile";

const tabs = [
  { key: "overview", label: "Overview", icon: LayoutDashboard, needs: "overview.view" },
  { key: "server", label: "Server", icon: Server, needs: "server.view" },
  { key: "users", label: "Users", icon: UsersRound, needs: "users.view" },
  { key: "activity", label: "Activity", icon: ScrollText, needs: "activity.view" },
  { key: "spend", label: "Spend", icon: Coins, needs: "spend.view" },
  { key: "roles", label: "Roles", icon: KeyRound, needs: "roles.view" },
] as const satisfies readonly (Omit<PageTab, "href"> & { needs: Permission })[];

export type AdminMode =
  /** A signed-in staff member looking at the live app. */
  | { kind: "live"; account: Account }
  /** The public demo: invented data, owner's view, nothing can be changed. */
  | { kind: "demo" };

type Params = Record<string, string | string[] | undefined>;

/**
 * The console's frame, shared by the live console (/admin) and the public demo (/demo/admin). It only asks `source`
 * (one page at a time, filtered where the data lives), so live and demo show the same things the same way.
 * `rail` comes from the page: the live console passes the signed-in Rail, the demo its own (no server actions).
 * `clock` is "now" on the viewer's clock, for the header's "Live · updated 18:52".
 */
/**
 * `act` and `find` are the staff server actions, passed in by the live page only; the demo passes neither, so its
 * dialogs can't send anything (and its pages never load the code that would).
 */
export async function AdminShell({
  mode,
  params,
  source,
  rail,
  clock,
  today,
  act,
  find,
}: {
  mode: AdminMode;
  params: Params;
  source: AdminSource;
  rail: React.ReactNode;
  clock: string;
  today: string;
  act?: StaffAct;
  find?: FindAccount;
}) {
  const requested = typeof params.tab === "string" ? params.tab : undefined;
  const role: Role = mode.kind === "demo" ? "owner" : mode.account.role;
  const base = mode.kind === "demo" ? "/demo/admin" : "/admin";
  // The Server tab waits for the box (collector, backups, certificate): hidden until it can show real numbers.
  const shownTabs = tabs.filter((t) => can(role, t.needs) && (t.key !== "server" || source.serverReady));
  const tab = shownTabs.find((t) => t.key === requested)?.key ?? shownTabs[0].key;
  // Moderators don't see the overview (the database refuses it), so they get no figures and no brake pills.
  const overview = can(role, "overview.view") ? await source.overview() : null;

  return (
    <div className="flex h-screen">
      {rail}
      <main className="flex min-w-0 flex-1 flex-col gap-5 p-6">
        <div className="flex items-center gap-4">
          <ShieldUser size={22} strokeWidth={1.9} className="text-brand-strong" />
          <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Admin</h1>
          <PageTabs current={tab} tabs={shownTabs.map((t) => ({ ...t, href: t.key === shownTabs[0].key ? base : `${base}?tab=${t.key}` }))} />
          {mode.kind === "demo" ? (
            <div role="note" className="flex items-center gap-2 rounded-full border border-figure/40 bg-figure-soft px-3.5 py-1.5 text-[12.5px] font-semibold text-figure">
              <Eye size={14} strokeWidth={2.2} />
              Demo · invented data · read-only
            </div>
          ) : (
            <StatusPill status={doneStatus(params, clock)} />
          )}
          {/* A pulled brake shows on every tab: calm indigo, since it is a chosen state, not a problem (no hatching behind text). */}
          {overview &&
            (["all", "guests"] as const).map((kind) => {
              const p = overview.pauses[kind];
              if (!p || (kind === "guests" && overview.pauses.all)) return null;
              const [day, time] = p.since.split("T");
              const since = day === overview.today ? time : whenLabel(p.since, overview.today);
              const label = `${kind === "all" ? "All summaries" : "Guests"} paused · since ${since}`;
              return can(role, "spend.view") ? (
                <Link key={kind} href={`${base}?tab=spend`} className="flex items-center gap-2 rounded-full border border-brand-line bg-brand-soft px-3.5 py-1.5 text-[12.5px] font-semibold text-brand-strong hover:border-brand-strong">
                  <OctagonPause size={14} strokeWidth={2.2} />
                  {label}
                </Link>
              ) : (
                <span key={kind} className="flex items-center gap-2 rounded-full border border-brand-line bg-brand-soft px-3.5 py-1.5 text-[12.5px] font-semibold text-brand-strong">
                  <OctagonPause size={14} strokeWidth={2.2} />
                  {label}
                </span>
              );
            })}
        </div>
        {tab === "overview" && overview && <AdminOverview overview={overview} recent={await source.recentNotable()} base={base} serverReady={source.serverReady} />}
        {tab === "server" && overview && <AdminServer overview={overview} base={base} />}
        {tab === "roles" && <RolesTab source={source} base={base} />}
        {tab === "spend" && overview && <SpendTab overview={overview} source={source} params={params} role={role} base={base} />}
        {tab === "activity" && <ActivityTab source={source} params={params} base={base} today={today} />}
        {tab === "users" &&
          (typeof params.user === "string" ? (
            <UserDetailTab source={source} username={params.user} viewer={role} base={base} />
          ) : (
            <UsersTab source={source} params={params} base={base} showSpend={can(role, "spend.view")} />
          ))}
      </main>
      {typeof params.dialog === "string" && (
        <AdminDialog name={params.dialog} source={source} overview={overview} params={params} role={role} staff={{ demo: mode.kind === "demo", act, back: pageHref(base, params) }} find={find} />
      )}
    </div>
  );
}

/** The database filters, counts and reads one page; the browser never gets the rest. */
async function UsersTab({ source, params, base, showSpend }: { source: AdminSource; params: Params; base: string; showSpend: boolean }) {
  const filters = userFiltersFrom(params);
  const { rows, page, counts } = await source.users(filters, params.page);
  return <AdminUsers rows={rows} page={page} counts={counts} filters={filters} showSpend={showSpend} base={base} />;
}

async function UserDetailTab({ source, username, viewer, base }: { source: AdminSource; username: string; viewer: Role; base: string }) {
  const detail = await source.userDetail(username);
  if (!detail) notFound();
  return <AdminUserDetail detail={detail} viewer={viewer} base={base} />;
}

async function ActivityTab({ source, params, base, today }: { source: AdminSource; params: Params; base: string; today: string }) {
  const filters = activityFiltersFrom(params);
  const { rows, page, counts } = await source.activity(filters, params.page);
  return <AdminActivity rows={rows} page={page} counts={counts} filters={filters} today={today} base={base} />;
}

async function RolesTab({ source, base }: { source: AdminSource; base: string }) {
  const { holders, changes } = await source.roles();
  return <AdminRoles holders={holders} changes={changes} base={base} />;
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

async function SpendTab({ overview, source, params, role, base }: { overview: Overview; source: AdminSource; params: Params; role: Role; base: string }) {
  const today = overview.today;
  const [, m, d] = today.split("-").map(Number);
  const { rows, page } = await source.spend(`${today.slice(0, 8)}01`, params.page);
  return (
    <AdminSpend
      overview={overview}
      rows={rows}
      page={page}
      monthLabel={d === 1 ? `${monthNames[m - 1]} 1` : `${monthNames[m - 1]} 1–${d}`}
      canChangeCap={can(role, "limits.change")}
      canPause={can(role, "summaries.pause")}
      base={base}
    />
  );
}

/**
 * The open dialog, named in the URL (?dialog=suspend). Each one is filled from the same source as the page under it,
 * and only opens for someone who holds the permission. The server checks again when it's confirmed; the demo never
 * confirms.
 */
async function AdminDialog({
  name,
  source,
  overview,
  params,
  role,
  staff,
  find,
}: {
  name: string;
  source: AdminSource;
  overview: Overview | null;
  params: Params;
  role: Role;
  staff: StaffProps;
  find?: FindAccount;
}) {
  const user = typeof params.user === "string" ? params.user : "";
  const who = typeof params.who === "string" ? params.who : "";
  const needs: Record<string, Permission> = {
    suspend: "users.suspend",
    restore: "users.suspend",
    signout: "users.signOut",
    reset: "users.resetLimit",
    role: "roles.change",
    grant: "roles.change",
    revoke: "roles.change",
    cap: "limits.change",
    "pause-guests": "summaries.pause",
    "pause-all": "summaries.pause",
    "resume-guests": "summaries.pause",
    "resume-all": "summaries.pause",
  };
  if (!needs[name] || !can(role, needs[name])) return null;

  // Actions on a person show only for people below the viewer's role (never their own page, never the owner).
  const target = async (username: string) => {
    const detail = await source.userDetail(username);
    return detail && outranks(role, detail.row.person.role) ? detail : null;
  };
  switch (name) {
    case "suspend": {
      const detail = await target(user);
      return detail && detail.row.status !== "suspended" && <SuspendDialog person={detail.row.person} devices={detail.sessions.length} summaries={detail.row.summaries} staff={staff} />;
    }
    case "restore": {
      const [detail, suspension] = await Promise.all([target(user), source.suspension(user)]);
      return (
        detail &&
        detail.row.status === "suspended" && (
          <RestoreDialog person={detail.row.person} suspendedBy={suspension?.by ?? null} suspendedOn={suspension?.on ?? ""} suspendedFor={suspension?.reason ?? ""} staff={staff} />
        )
      );
    }
    case "signout": {
      const detail = await target(user);
      return detail && detail.sessions.length > 0 && <SignOutDialog person={detail.row.person} sessions={detail.sessions} staff={staff} />;
    }
    case "reset": {
      const detail = await target(user);
      return (
        detail && (
          <ResetLimitDialog
            person={detail.row.person}
            used={detail.hour.used}
            limit={detail.hour.limit}
            nextFree={detail.hour.resetsAt ?? "now"}
            today={detail.day ? `${detail.day.used} of ${detail.day.limit}` : "guest limit"}
            staff={staff}
          />
        )
      );
    }
    case "role":
    case "revoke": {
      const h = (await source.roles()).holders.find((x) => x.person.username === who);
      if (!h || !outranks(role, h.person.role)) return null;
      return name === "role" ? <ChangeRoleDialog person={h.person} to={h.person.role} staff={staff} /> : <RevokeDialog person={h.person} since={h.since} staff={staff} />;
    }
    case "grant": {
      // From someone's page it starts with them; from Roles it starts empty and looks the account up.
      const detail = who ? await target(who) : null;
      const person = detail && detail.row.person.role === "user" && detail.row.status !== "suspended" ? detail.row.person : null;
      return <GrantRoleDialog person={person} to="moderator" staff={staff} find={find} />;
    }
  }

  if (!overview) return null;
  const f = overviewFigures(overview);
  switch (name) {
    case "cap":
      return (
        <ChangeCapDialog
          capUsd={overview.spend.capUsd}
          dailyCapUsd={overview.spend.dailyCapUsd}
          workspaceCapUsd={overview.spend.workspaceCapUsd}
          monthUsd={f.spend.monthUsd}
          todayUsd={f.spend.todayUsd}
          projectedUsd={f.spend.projectedUsd}
          staff={staff}
        />
      );
    case "pause-guests":
      return (
        !overview.pauses.guests && (
          <PauseDialog
            kind="guests"
            staff={staff}
            facts={[
              { kind: "people", text: `${overview.guests.active} guests active now: their next summary is refused` },
              { kind: "stop", text: `"Try it as a guest" is replaced by a note on the sign-in page` },
              { kind: "keep", text: `${overview.users.registered} accounts keep working` },
            ]}
          />
        )
      );
    case "pause-all":
      return (
        !overview.pauses.all && (
          <PauseDialog
            kind="all"
            staff={staff}
            facts={[
              { kind: "stop", text: `Every new summary is refused, including yours (${f.summaries.today} made today)` },
              { kind: "keep", text: "Summaries already made stay readable in Saved" },
            ]}
          />
        )
      );
    case "resume-guests":
    case "resume-all": {
      const p = name === "resume-guests" ? overview.pauses.guests : overview.pauses.all;
      return p && <ResumeDialog kind={name === "resume-guests" ? "guests" : "all"} pausedBy={p.by} pausedOn={whenLabel(p.since, overview.today)} pausedFor={p.reason} staff={staff} />;
    }
    default:
      return null;
  }
}

const doneLabels: Record<string, string> = {
  suspend: "Suspended",
  restore: "Restored",
  signout: "Signed out everywhere:",
  reset: "Limit reset for",
  role: "Role changed for",
  grant: "Role granted to",
  revoke: "Role revoked from",
  cap: "Caps saved",
  "pause-guests": "Guests paused",
  "pause-all": "All summaries paused",
  "resume-guests": "Guests resumed",
  "resume-all": "All summaries resumed",
};
/** Actions about the whole app, not one person: their header line names no one. */
const appWide = ["cap", "pause-guests", "pause-all", "resume-guests", "resume-all"];

/**
 * The page under a dialog: the same URL without the dialog and without the last "done". `who` names a dialog's person
 * everywhere but Activity, where it is the search, so it stays there.
 */
function pageHref(base: string, params: Params): string {
  const p = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value !== "string" || key === "dialog" || key === "done" || (key === "who" && params.tab !== "activity")) continue;
    p.set(key, value);
  }
  const query = p.toString();
  return query ? `${base}?${query}` : base;
}

/** The header's status: live by default; after an action, what was just done (never silent), or why it failed. */
function doneStatus(params: Params, clock: string): AppStatus {
  const done = typeof params.done === "string" ? params.done : null;
  if (done === "error") return { kind: "error", label: "Couldn't save · try again" };
  if (done && doneLabels[done]) {
    const who = typeof params.user === "string" ? params.user : typeof params.who === "string" ? params.who : null;
    return { kind: "saved", label: who && !appWide.includes(done) ? `${doneLabels[done]} @${who} ·` : `${doneLabels[done]} ·`, at: clock };
  }
  return { kind: "saved", label: "Live · updated", at: clock };
}
