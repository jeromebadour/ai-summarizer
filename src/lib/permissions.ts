export const roles = ["owner", "admin", "moderator", "user", "guest"] as const;
export type Role = (typeof roles)[number];

export const permissions = [
  "overview.view",
  "server.view",
  "spend.view",
  "users.view",
  "activity.view",
  "users.suspend",
  "users.signOut",
  "users.resetLimit",
  "roles.view",
  "roles.change",
  "limits.change",
] as const;
export type Permission = (typeof permissions)[number];

/** The fixed matrix from the admin plan. Checked on the server for every admin request; the UI only hides. */
const matrix: Record<Role, readonly Permission[]> = {
  owner: permissions,
  admin: ["overview.view", "server.view", "spend.view", "users.view", "activity.view", "users.suspend", "users.signOut", "users.resetLimit"],
  moderator: ["users.view", "activity.view", "users.suspend", "users.signOut"],
  user: [],
  guest: [],
};

/** A child permission never counts without the view it lives under. */
const parent: Partial<Record<Permission, Permission>> = {
  "users.suspend": "users.view",
  "users.signOut": "users.view",
  "users.resetLimit": "users.view",
  "roles.change": "roles.view",
};

export function can(role: Role, permission: Permission): boolean {
  const held = matrix[role];
  const needs = parent[permission];
  return held.includes(permission) && (needs === undefined || held.includes(needs));
}

export function isStaff(role: Role): boolean {
  return role === "owner" || role === "admin" || role === "moderator";
}

export const roleLabel: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  moderator: "Moderator",
  user: "User",
  guest: "Guest",
};

/** What each permission means, in plain words, grouped the way the Roles tab shows them. */
export const permissionInfo: Record<Permission, { label: string; group: "See" | "Act on users" | "Owner only" }> = {
  "overview.view": { label: "Overview", group: "See" },
  "server.view": { label: "Server", group: "See" },
  "spend.view": { label: "Spend", group: "See" },
  "users.view": { label: "Users", group: "See" },
  "activity.view": { label: "Activity", group: "See" },
  "users.suspend": { label: "Suspend and restore", group: "Act on users" },
  "users.signOut": { label: "Sign out everywhere", group: "Act on users" },
  "users.resetLimit": { label: "Reset the hourly limit", group: "Act on users" },
  "roles.view": { label: "See roles", group: "Owner only" },
  "roles.change": { label: "Grant and revoke roles", group: "Owner only" },
  "limits.change": { label: "Change limits and the cap", group: "Owner only" },
};
