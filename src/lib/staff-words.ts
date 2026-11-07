/**
 * Staff actions in words. The audit log stores facts (an action code, who it was about, the reason, details such as
 * a role or a cap); Activity and a user's page both word them here, so the same action always reads the same.
 */
export type AuditFacts = { action: string; target: string | null; reason: string | null; details: Record<string, unknown> | null };

const roleName = (d: AuditFacts["details"]) => String(d?.role ?? "a role").replace(/^./, (c) => c.toUpperCase());

/** A full line for Activity: "Reset the hourly limit of @kevin_n · Preparing a client report". */
export function staffSentence(f: AuditFacts): string {
  const who = f.target ? `@${f.target}` : "an account";
  const d = f.details ?? {};
  const line = (() => {
    switch (f.action) {
      case "suspend":
        return `Suspended ${who}`;
      case "restore":
        return `Restored ${who}`;
      case "sign_out_all":
        return `Signed ${who} out everywhere`;
      case "reset_limit":
        return `Reset the hourly limit of ${who}`;
      case "grant_role":
        return `Granted ${roleName(d)} to ${who}`;
      case "revoke_role":
        return `Revoked ${roleName(d)} from ${who}`;
      case "change_role":
        return `Changed ${who} to ${roleName(d)}`;
      case "pause_guests":
        return "Paused guests";
      case "resume_guests":
        return "Resumed guests";
      case "pause_all":
        return "Paused all summaries";
      case "resume_all":
        return "Resumed all summaries";
      case "change_caps":
        return `Changed the caps to $${Number(d.monthly ?? 0).toFixed(2)} a month, $${Number(d.daily ?? 0).toFixed(2)} a day`;
      default:
        return f.action.replace(/_/g, " ");
    }
  })();
  return f.reason ? `${line} · ${f.reason}` : line;
}

/** A short label for the list of staff actions on one person's page: "Reset the hourly limit". */
export function staffActionLabel(action: string, details: Record<string, unknown> | null): string {
  switch (action) {
    case "suspend":
      return "Suspended";
    case "restore":
      return "Restored";
    case "sign_out_all":
      return "Signed out everywhere";
    case "reset_limit":
      return "Reset the hourly limit";
    case "grant_role":
      return `Granted ${roleName(details)}`;
    case "revoke_role":
      return `Revoked ${roleName(details)}`;
    case "change_role":
      return `Changed to ${roleName(details)}`;
    default:
      return action.replace(/_/g, " ");
  }
}
