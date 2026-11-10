import { UserRound } from "@/components/glyphs";
import { Avatar } from "@/components/Avatar";
import type { Person } from "@/lib/admin";
import { roleLabel, type Role } from "@/lib/permissions";

/** Each role has its own colour, used for the name and the badge, so a role reads without reading. */
export const roleTone: Record<Role, { text: string; badge: string }> = {
  owner: { text: "text-figure", badge: "border-figure/40 bg-figure-soft text-figure" },
  admin: { text: "text-bullets", badge: "border-bullets/40 bg-bullets-soft text-bullets" },
  moderator: { text: "text-verify", badge: "border-verify/40 bg-verify-soft text-verify" },
  user: { text: "text-text", badge: "border-brand-line bg-brand-soft text-brand-strong" },
  guest: { text: "text-input", badge: "border-input/35 bg-input-soft text-input" },
};

export function RoleBadge({ role }: { role: Role }) {
  return <span className={`rounded-md border px-1.5 py-px text-[11px] font-semibold ${roleTone[role].badge}`}>{roleLabel[role]}</span>;
}

/** How the console shows anyone: avatar, name in the role's colour, @username and the role badge. */
/** `nobody` names who is missing when there is no person (nobody signed in, or the account was deleted). */
export function PersonLine({ person, size = 32, nobody = "Not signed in", inline = false }: { person: Person | null; size?: number; nobody?: string; inline?: boolean }) {
  if (!person) {
    return (
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="grid shrink-0 place-items-center rounded-full border border-dashed border-border-strong text-faint" style={{ width: size, height: size }}>
          <UserRound size={Math.round(size * 0.5)} strokeWidth={1.9} />
        </span>
        <span className="text-[13px] font-semibold text-muted">{nobody}</span>
      </span>
    );
  }
  const guest = person.role === "guest";
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      {guest ? (
        <span className="grid shrink-0 place-items-center rounded-full border border-input/40 bg-input-soft text-input" style={{ width: size, height: size }}>
          <UserRound size={Math.round(size * 0.5)} strokeWidth={1.9} />
        </span>
      ) : (
        <Avatar name={person.name} colour={person.avatarColour} size={size} />
      )}
      {inline ? (
        // One line, for dense tables: name, @username, badge side by side.
        <span className="flex min-w-0 items-center gap-2">
          <span className={`truncate text-[13px] font-semibold ${roleTone[person.role].text}`}>{person.name}</span>
          <span className="truncate font-mono text-[11px] text-muted">@{person.username}</span>
          {!guest && <RoleBadge role={person.role} />}
        </span>
      ) : (
        <span className="min-w-0 leading-tight">
          <span className="flex items-center gap-2">
            <span className={`truncate text-[13px] font-semibold ${roleTone[person.role].text}`}>{person.name}</span>
            {/* A guest's glyph and colour already say "guest"; the badge would only repeat it. */}
            {!guest && <RoleBadge role={person.role} />}
          </span>
          <span className="block font-mono text-[11px] text-muted">@{person.username}</span>
        </span>
      )}
    </span>
  );
}
