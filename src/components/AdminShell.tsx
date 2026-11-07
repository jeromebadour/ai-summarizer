import { Coins, Eye, KeyRound, LayoutDashboard, OctagonPause, ScrollText, Server, ShieldUser, UsersRound } from "lucide-react";
import { AdminActivity, activityKinds } from "@/components/AdminActivity";
import { AdminOverview } from "@/components/AdminOverview";
import { ChangeCapDialog, ChangeRoleDialog, GrantRoleDialog, PauseDialog, ResetLimitDialog, RestoreDialog, ResumeDialog, RevokeDialog, SignOutDialog, SuspendDialog } from "@/components/AdminDialogs";
import { AdminRoles } from "@/components/AdminRoles";
import { AdminServer } from "@/components/AdminServer";
import { AdminSpend } from "@/components/AdminSpend";
import { AdminUserDetail } from "@/components/AdminUserDetail";
import { AdminUsers } from "@/components/AdminUsers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTabs, type PageTab } from "@/components/PageTabs";
import { StatusPill, type AppStatus } from "@/components/StatusPill";
import { isNotable, overviewFigures, whenLabel, type ActivityEntry, type ActivityKind, type AdminOverview as Overview, type Person, type RoleChange, type RoleHolder, type UserDetail, type UserRow } from "@/lib/admin";
import { pageOf, pageSizes } from "@/lib/paging";
import { can, roles, type Permission, type Role } from "@/lib/permissions";
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

/** The console's frame, shared by the live console (/admin) and the public demo (/demo/admin). */
export type SpendRow = { person: Person; summaries: number; inputTokens: number; outputTokens: number; costUsd: number };

export type AdminData = {
  overview: Overview;
  users: UserRow[];
  userDetail: (username: string) => UserDetail | null;
  activity: ActivityEntry[];
  /** Spend per person from a day on (YYYY-MM-DD), most first. */
  spendByUser: (fromDay: string) => SpendRow[];
  roles: { holders: RoleHolder[]; changes: RoleChange[] };
};

/** `rail` comes from the page: the live console passes the signed-in Rail, the demo its own (no server actions). */
export function AdminShell({ mode, params, data, rail }: { mode: AdminMode; params: Record<string, string | string[] | undefined>; data: AdminData; rail: React.ReactNode }) {
  const requested = typeof params.tab === "string" ? params.tab : undefined;
  const { overview } = data;
  const role: Role = mode.kind === "demo" ? "owner" : mode.account.role;
  const base = mode.kind === "demo" ? "/demo/admin" : "/admin";
  const shownTabs = tabs.filter((t) => can(role, t.needs));
  const tab = shownTabs.find((t) => t.key === requested)?.key ?? shownTabs[0].key;

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
            <StatusPill status={doneStatus(params)} />
          )}
          {/* A pulled brake shows on every tab: calm indigo, since it is a chosen state, not a problem (no hatching behind text). */}
          {(["all", "guests"] as const).map((kind) => {
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
        {tab === "overview" && <AdminOverview overview={overview} recent={data.activity.filter(isNotable).slice(0, 5)} base={base} />}
        {tab === "server" && <AdminServer overview={overview} base={base} />}
        {tab === "roles" && <AdminRoles holders={data.roles.holders} changes={data.roles.changes} />}
        {tab === "spend" && <SpendTab data={data} params={params} role={role} base={base} />}
        {tab === "activity" && <ActivityTab activity={data.activity} params={params} today={overview.today} base={base} />}
        {tab === "users" &&
          (typeof params.user === "string" ? (
            <UserDetailTab detail={data.userDetail(params.user)} viewer={role} base={base} />
          ) : (
            <UsersTab users={data.users} params={params} base={base} />
          ))}
      </main>
      {typeof params.dialog === "string" && <AdminDialog name={params.dialog} data={data} params={params} demo={mode.kind === "demo"} />}
    </div>
  );
}

/** Stands in for the paged query: the server filters, counts and reads one page; the browser never gets the rest. */
function UsersTab({ users, params, base }: { users: UserRow[]; params: Record<string, string | string[] | undefined>; base: string }) {
  const counts = {
    roles: Object.fromEntries(roles.map((r) => [r, users.filter((u) => u.person.role === r).length])) as Record<Role, number>,
    suspended: users.filter((u) => u.status === "suspended").length,
  };
  const page = pageOf(params.page, users.length, pageSizes.adminTable);
  return (
    <AdminUsers
      rows={users.slice(page.offset, page.offset + page.size)}
      page={page}
      counts={counts}
      filters={{ query: "", roles: [], suspendedOnly: false }}
      base={base}
    />
  );
}

function UserDetailTab({ detail, viewer, base }: { detail: UserDetail | null; viewer: Role; base: string }) {
  if (!detail) notFound();
  return <AdminUserDetail detail={detail} viewer={viewer} base={base} />;
}

function ActivityTab({ activity, params, today, base }: { activity: ActivityEntry[]; params: Record<string, string | string[] | undefined>; today: string; base: string }) {
  const counts = Object.fromEntries(activityKinds.map((k) => [k, activity.filter((e) => e.kind === k).length])) as Record<ActivityKind, number>;
  const page = pageOf(params.page, activity.length, pageSizes.adminTable);
  return <AdminActivity rows={activity.slice(page.offset, page.offset + page.size)} page={page} counts={counts} selected={[]} today={today} base={base} />;
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function SpendTab({ data, params, role, base }: { data: AdminData; params: Record<string, string | string[] | undefined>; role: Role; base: string }) {
  const today = data.overview.today;
  const [, m, d] = today.split("-").map(Number);
  const all = data.spendByUser(`${today.slice(0, 8)}01`);
  const page = pageOf(params.page, all.length, pageSizes.adminTable);
  return (
    <AdminSpend
      overview={data.overview}
      rows={all.slice(page.offset, page.offset + page.size)}
      page={page}
      monthLabel={d === 1 ? `${monthNames[m - 1]} 1` : `${monthNames[m - 1]} 1–${d}`}
      canChangeCap={can(role, "limits.change")}
      canPause={can(role, "summaries.pause")}
      base={base}
    />
  );
}

/**
 * The open dialog, named in the URL (?dialog=suspend). Each one is filled from the same data as the page under it.
 * The server checks the permission again when it's confirmed; the demo never confirms.
 */
function AdminDialog({ name, data, params, demo }: { name: string; data: AdminData; params: Record<string, string | string[] | undefined>; demo: boolean }) {
  const detail = typeof params.user === "string" ? data.userDetail(params.user) : null;
  const holder = (username: string) => data.roles.holders.find((h) => h.person.username === username);
  const f = overviewFigures(data.overview);
  switch (name) {
    case "suspend":
      return detail && <SuspendDialog person={detail.row.person} devices={detail.sessions.length} summaries={detail.row.summaries} demo={demo} />;
    case "restore": {
      const event = data.activity.find((e) => e.kind === "staff" && detail && e.detail.startsWith(`Suspended @${detail.row.person.username}`));
      return (
        detail &&
        event?.person && (
          <RestoreDialog person={detail.row.person} suspendedBy={event.person} suspendedOn={whenLabel(event.when, data.overview.today)} suspendedFor={event.detail.split(" · ")[1] ?? ""} demo={demo} />
        )
      );
    }
    case "signout":
      return detail && <SignOutDialog person={detail.row.person} sessions={detail.sessions} demo={demo} />;
    case "reset":
      return (
        detail && (
          <ResetLimitDialog
            person={detail.row.person}
            used={detail.hour.used}
            limit={detail.hour.limit}
            nextFree={detail.hour.resetsAt ?? "now"}
            today={detail.day ? `${detail.day.used} of ${detail.day.limit}` : "guest limit"}
            demo={demo}
          />
        )
      );
    case "role": {
      const h = holder(typeof params.who === "string" ? params.who : "");
      return h && <ChangeRoleDialog person={h.person} to="admin" demo={demo} />;
    }
    case "grant": {
      const u = data.users.find((r) => r.person.username === params.who);
      return u && <GrantRoleDialog person={u.person} to="moderator" demo={demo} />;
    }
    case "revoke": {
      const h = holder(typeof params.who === "string" ? params.who : "");
      return h && <RevokeDialog person={h.person} since={h.since} demo={demo} />;
    }
    case "cap":
      return (
        <ChangeCapDialog
          capUsd={data.overview.spend.capUsd}
          dailyCapUsd={data.overview.spend.dailyCapUsd}
          workspaceCapUsd={data.overview.spend.workspaceCapUsd}
          monthUsd={f.spend.monthUsd}
          todayUsd={f.spend.todayUsd}
          projectedUsd={f.spend.projectedUsd}
          demo={demo}
        />
      );
    case "pause-guests":
      return (
        !data.overview.pauses.guests && (
          <PauseDialog
            kind="guests"
            demo={demo}
            facts={[
              { kind: "people", text: `${data.overview.guests.active} guests active now: their next summary is refused` },
              { kind: "stop", text: `"Try it as a guest" is replaced by a note on the sign-in page` },
              { kind: "keep", text: `${data.overview.users.registered} accounts keep working` },
            ]}
          />
        )
      );
    case "pause-all":
      return (
        !data.overview.pauses.all && (
          <PauseDialog
            kind="all"
            demo={demo}
            facts={[
              { kind: "stop", text: `Every new summary is refused, including yours (${f.summaries.today} made today)` },
              { kind: "keep", text: "Summaries already made stay readable in Saved" },
            ]}
          />
        )
      );
    case "resume-guests":
    case "resume-all": {
      const p = name === "resume-guests" ? data.overview.pauses.guests : data.overview.pauses.all;
      return p && <ResumeDialog kind={name === "resume-guests" ? "guests" : "all"} pausedBy={p.by} pausedOn={whenLabel(p.since, data.overview.today)} pausedFor={p.reason} demo={demo} />;
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
  cap: "Monthly cap saved",
};

/** The header's status: live by default; after an action, what was just done (never silent), or why it failed. */
function doneStatus(params: Record<string, string | string[] | undefined>): AppStatus {
  const done = typeof params.done === "string" ? params.done : null;
  if (done === "error") return { kind: "error", label: "Couldn't save · try again" };
  if (done && doneLabels[done]) {
    const who = typeof params.user === "string" ? params.user : typeof params.who === "string" ? params.who : null;
    return { kind: "saved", label: who && done !== "cap" ? `${doneLabels[done]} @${who} ·` : `${doneLabels[done]} ·`, at: "12:31" };
  }
  return { kind: "saved", label: "Live · updated", at: "12:31" };
}
