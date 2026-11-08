import { Ban, CalendarDays, ChevronRight, CircleCheck, Coins, FileText, Mail, UserRound, type LucideIcon } from "lucide-react";
import Link from "@/components/NavLink";
import { AdminSearch } from "@/components/AdminSearch";
import { Pager } from "@/components/Pager";
import { PhoneScroll } from "@/components/PhoneScroll";
import { usersHref, type UserFilters } from "@/lib/admin-source";
import { PersonLine, roleTone } from "@/components/PersonLine";
import { RowNumber, RowNumberHead } from "@/components/RowNumber";
import { formatCost, type Recency, type UserRow, type UserStatus } from "@/lib/admin";
import type { Page } from "@/lib/paging";
import { roleLabel, type Role } from "@/lib/permissions";

const columns = "grid-cols-[32px_minmax(0,1.4fr)_minmax(0,1.3fr)_150px_120px_90px_90px_118px_20px]";
/** Without the Spend column, for staff who don't see spend (moderators). */
const columnsNoSpend = "grid-cols-[32px_minmax(0,1.4fr)_minmax(0,1.3fr)_150px_120px_90px_118px_20px]";

const statusLook: Record<UserStatus, { icon: LucideIcon; label: string; tone: string }> = {
  active: { icon: CircleCheck, label: "Active", tone: "border-verify/35 bg-verify-soft text-verify" },
  guest: { icon: UserRound, label: "Guest", tone: "border-input/35 bg-input-soft text-input" },
  suspended: { icon: Ban, label: "Suspended", tone: "border-clear/40 bg-clear-soft text-clear" },
};

const recencyTone: Record<Recency, string> = {
  now: "text-verify",
  today: "text-brand-strong",
  week: "text-input",
  older: "text-faint",
};

/** A filter chip is a link to the same view with that filter switched (back to page 1). */
function Chip({ href, active, tone, icon: Icon, label, count }: { href: string; active: boolean; tone: string; icon?: LucideIcon; label: string; count: number }) {
  return (
    <Link
      href={href as never}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12.5px] font-semibold ${active ? tone : "border-border text-muted hover:bg-panel-raised"}`}
    >
      {Icon && <Icon size={14} strokeWidth={2.1} />}
      {label}
      <span className="font-mono text-[11px] font-medium opacity-75">{count}</span>
    </Link>
  );
}

/** Every user, newest first, 15 a page. Staff see who and how much, never what anyone pasted. */
export function AdminUsers({
  rows,
  page,
  counts,
  filters,
  showSpend,
  base,
}: {
  rows: UserRow[];
  page: Page;
  counts: { roles: Record<Role, number>; suspended: number };
  filters: UserFilters;
  /** Owner and admin; the database sends moderators no costs, and the column goes with them. */
  showSpend: boolean;
  base: string;
}) {
  const roles: Role[] = ["owner", "admin", "moderator", "user", "guest"];
  const grid = showSpend ? columns : columnsNoSpend;
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3 rounded-2xl border border-border bg-panel p-4 max-md:p-3">
      <div className="flex items-center gap-3 max-md:flex-wrap max-md:gap-2">
        <AdminSearch name="q" value={filters.query} hrefBase={usersHref(base, { ...filters, query: "" })} placeholder="Search name, @username or email" width="w-[360px]" />
        <div className="flex gap-1.5 max-md:flex-wrap">
          {roles.map((role) => (
            <Chip
              key={role}
              href={usersHref(base, { ...filters, roles: filters.roles.includes(role) ? filters.roles.filter((r) => r !== role) : [...filters.roles, role] })}
              active={filters.roles.includes(role)}
              tone={roleTone[role].badge}
              label={roleLabel[role]}
              count={counts.roles[role]}
            />
          ))}
          <Chip
            href={usersHref(base, { ...filters, suspendedOnly: !filters.suspendedOnly })}
            active={filters.suspendedOnly}
            tone={statusLook.suspended.tone}
            icon={Ban}
            label="Suspended"
            count={counts.suspended}
          />
        </div>
        <span className="ml-auto font-mono text-[11.5px] text-muted max-md:hidden">Newest first</span>
      </div>

      <PhoneScroll minWidth="max-md:min-w-[1080px]">
      <div className={`grid ${grid} gap-4 border-b border-border px-3 pb-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-faint`}>
        <RowNumberHead />
        <span>User</span>
        <span>Email</span>
        <span>Joined</span>
        <span>Last active</span>
        <span className="text-right">Summaries</span>
        {showSpend && <span className="text-right">Spend</span>}
        <span>Status</span>
        <span />
      </div>

      <ul className="-mt-1 flex min-h-0 flex-1 flex-col">
        {rows.map((row, index) => {
          const status = statusLook[row.status];
          const StatusIcon = status.icon;
          return (
            <li key={row.person.id}>
              <Link
                href={`${base}?tab=users&user=${row.person.username}` as never}
                className={`group grid ${grid} items-center gap-4 rounded-lg px-3 py-[3px] hover:bg-brand-soft`}
              >
                <RowNumber n={page.offset + index + 1} />
                <PersonLine person={row.person} size={28} />
                <span className="flex min-w-0 items-center gap-2 text-[12.5px]">
                  <Mail size={13} strokeWidth={2} className={`shrink-0 ${row.email ? "text-input" : "text-faint"}`} />
                  {row.email ? <span className="truncate text-text">{row.email}</span> : <span className="text-faint">No email (guest)</span>}
                </span>
                <span className="flex items-center gap-1.5 whitespace-nowrap font-mono text-[11.5px] text-input">
                  <CalendarDays size={13} strokeWidth={2} />
                  {row.joined}
                </span>
                <span className={`flex items-center gap-1.5 font-mono text-[11.5px] ${recencyTone[row.lastActive.recency]}`}>
                  {row.lastActive.recency === "now" && <span className="size-1.5 rounded-full bg-verify shadow-[0_0_8px_var(--verify)]" />}
                  {row.lastActive.label}
                </span>
                <span className="flex items-center justify-end gap-1.5 font-mono text-[12px] text-brand-strong">
                  {row.summaries}
                  <FileText size={13} strokeWidth={2} />
                </span>
                {showSpend && row.costUsd !== null && (
                  <span className="flex items-center justify-end gap-1.5 font-mono text-[12px] text-figure">
                    {formatCost(row.costUsd)}
                    <Coins size={13} strokeWidth={2} />
                  </span>
                )}
                <span>
                  <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11.5px] font-semibold ${status.tone}`}>
                    <StatusIcon size={12.5} strokeWidth={2.2} />
                    {status.label}
                  </span>
                </span>
                <ChevronRight size={16} strokeWidth={2} className="text-faint group-hover:text-brand-strong" />
              </Link>
            </li>
          );
        })}
      </ul>
      </PhoneScroll>

      <Pager page={page} noun="users" href={(n) => usersHref(base, filters, n)} />
    </section>
  );
}
