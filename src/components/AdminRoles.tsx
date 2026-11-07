import { ArrowUpRight, Check, Crown, KeyRound, Minus, ScrollText, ShieldCheck, UserRoundMinus, UserRoundPlus, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { PersonLine, RoleBadge, roleTone } from "@/components/PersonLine";
import { RowNumber } from "@/components/RowNumber";
import type { RoleChange, RoleHolder } from "@/lib/admin";
import { can, permissionInfo, permissions, roleLabel, type Permission, type Role } from "@/lib/permissions";

const staffRoles: Role[] = ["owner", "admin", "moderator"];
const groups = ["See", "Act on users", "Brakes", "Owner only"] as const;

function Panel({ icon: Icon, tone, title, aside, children, grow = false }: { icon: LucideIcon; tone: string; title: string; aside?: React.ReactNode; children: React.ReactNode; grow?: boolean }) {
  return (
    <section className={`flex min-h-0 flex-col rounded-2xl border border-border bg-panel p-4 ${grow ? "flex-1" : ""}`}>
      <div className="flex items-center gap-2 text-[12.5px] font-semibold text-text">
        <Icon size={16} strokeWidth={2} className={tone} />
        {title}
        {aside && <span className="ml-auto">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

/** Each kind of role change keeps its own colour and glyph: granted teal, changed owner gold, revoked rose. */
const changeLook: Record<RoleChange["action"], { label: string; joiner: string; tone: string; icon: React.ReactNode }> = {
  granted: { label: "Granted", joiner: "to", tone: "border-verify/35 bg-verify-soft text-verify", icon: <UserRoundPlus size={12} strokeWidth={2.2} /> },
  changed: { label: "Changed to", joiner: "for", tone: "border-figure/35 bg-figure-soft text-figure", icon: <KeyRound size={12} strokeWidth={2.2} /> },
  revoked: { label: "Revoked", joiner: "from", tone: "border-clear/35 bg-clear-soft text-clear", icon: <UserRoundMinus size={12} strokeWidth={2.2} /> },
};

/** Owner only: who holds Admin and Moderator, the fixed permission matrix, and every grant and revoke with its reason. */
export function AdminRoles({ holders, changes, base }: { holders: RoleHolder[]; changes: RoleChange[]; base: string }) {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[1.15fr_1fr] gap-4">
      <div className="flex min-h-0 flex-col gap-4">
        <Panel
          icon={KeyRound}
          tone="text-figure"
          title="Staff"
          aside={
            <Link
              href={`${base}?tab=roles&dialog=grant` as never}
              scroll={false}
              className="flex items-center gap-2 rounded-xl border border-figure/40 px-3 py-1.5 text-[12.5px] font-semibold text-figure hover:bg-figure-soft"
            >
              <UserRoundPlus size={15} strokeWidth={2} />
              Grant role
            </Link>
          }
        >
          <ul className="mt-3 flex flex-col">
            {staffRoles.flatMap((role) =>
              holders
                .filter((h) => h.person.role === role)
                .map((h) => (
                  <li key={h.person.id} className="grid grid-cols-[minmax(0,1fr)_170px_96px] items-center gap-4 border-b border-border py-1.5 last:border-b-0">
                    <PersonLine person={h.person} size={32} />
                    <span className="font-mono text-[11.5px] text-muted">
                      {role === "owner" ? (
                        <span className="flex items-center gap-1.5 text-figure">
                          <Crown size={13} strokeWidth={2.1} />
                          since launch, {h.since}
                        </span>
                      ) : (
                        <>
                          since <span className="text-input">{h.since}</span>
                          {h.grantedBy && (
                            <>
                              {" "}by <span className={roleTone[h.grantedBy.role].text}>@{h.grantedBy.username}</span>
                            </>
                          )}
                        </>
                      )}
                    </span>
                    {/* The owner can't be removed; everyone else can be revoked (with a reason, in a dialog). */}
                    {role !== "owner" && (
                      <Link
                        href={`${base}?tab=roles&dialog=revoke&who=${h.person.username}` as never}
                        scroll={false}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-clear/40 px-2.5 py-1.5 text-[12px] font-semibold text-clear hover:bg-clear-soft"
                      >
                        <UserRoundMinus size={14} strokeWidth={2} />
                        Revoke
                      </Link>
                    )}
                  </li>
                )),
            )}
          </ul>
        </Panel>

        <Panel
          icon={ScrollText}
          tone="text-brand-strong"
          title="Role changes"
          aside={
            <Link href={`${base}?tab=activity&kind=staff` as never} className="flex items-center gap-1 text-[12px] font-semibold text-brand-strong hover:underline">
              All staff actions
              <ArrowUpRight size={14} strokeWidth={2} />
            </Link>
          }
          grow
        >
          <ul className="mt-3 flex flex-col">
            {changes.map((c, i) => (
              <li key={c.id} className="grid grid-cols-[20px_52px_minmax(0,1fr)] items-start gap-3 border-b border-border py-1 last:border-b-0">
                <RowNumber n={i + 1} />
                <span className="pt-0.5 font-mono text-[11.5px] text-input">{c.at}</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
                    <span className={`font-semibold ${roleTone[c.actor.role].text}`}>{c.actor.name}</span>
                    <span className={`flex items-center gap-1 rounded-md border px-1.5 py-px text-[11px] font-semibold ${changeLook[c.action].tone}`}>
                      {changeLook[c.action].icon}
                      {changeLook[c.action].label}
                    </span>
                    <RoleBadge role={c.role} />
                    <span className="text-muted">{changeLook[c.action].joiner}</span>
                    <span className={`font-semibold ${roleTone[c.target.role].text}`}>{c.target.name}</span>
                    <span className="font-mono text-[11px] text-muted">@{c.target.username}</span>
                  </div>
                  <div className="mt-0.5 truncate text-[12px] text-muted">{c.reason}</div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel icon={ShieldCheck} tone="text-verify" title="What each role can do" aside={<span className="font-mono text-[11.5px] text-muted">fixed in code · checked on the server</span>}>
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_repeat(3,92px)]">
          <span />
          {staffRoles.map((role) => (
            <span key={role} className="flex justify-center pb-2">
              <RoleBadge role={role} />
            </span>
          ))}
          {groups.map((group) => (
            <div key={group} className="contents">
              <span className="col-span-4 mt-1.5 border-b border-border pb-1 font-mono text-[10.5px] uppercase tracking-[0.1em] text-faint">{group}</span>
              {permissions
                .filter((p) => permissionInfo[p].group === group)
                .map((p: Permission) => (
                  <div key={p} className="contents">
                    <span className="py-0.5 text-[13px] text-text">{permissionInfo[p].label}</span>
                    {staffRoles.map((role) => (
                      <span key={role} className="flex items-center justify-center py-0.5">
                        {can(role, p) ? (
                          <span className="grid size-6 place-items-center rounded-md border border-verify/35 bg-verify-soft text-verify" aria-label={`${roleLabel[role]}: yes`}>
                            <Check size={14} strokeWidth={2.4} />
                          </span>
                        ) : (
                          <span className="grid size-6 place-items-center text-faint" aria-label={`${roleLabel[role]}: no`}>
                            <Minus size={14} strokeWidth={2} />
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                ))}
            </div>
          ))}
        </div>
        <p className="mt-auto pt-3 text-[12px] leading-relaxed text-muted">
          Nobody, the owner included, can read what users paste or get back. Every staff action lands in Activity with its reason.
        </p>
      </Panel>
    </div>
  );
}
