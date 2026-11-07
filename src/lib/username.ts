export type UsernameCheck =
  | { status: "empty" }
  | { status: "invalid"; reason: string }
  | { status: "checking" }
  | { status: "available" }
  | { status: "taken" };

const pattern = /^[a-z0-9_]+$/;

/** Usernames are stored lowercase, so "Maya_K" and "maya_k" are the same name. */
export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@/, "").toLowerCase();
}

/** Format rules only; whether the name is free is answered by the server. */
export function checkUsernameFormat(raw: string): UsernameCheck {
  const name = normalizeUsername(raw);
  if (name === "") return { status: "empty" };
  if (name.length < 3) return { status: "invalid", reason: "At least 3 characters" };
  if (name.length > 20) return { status: "invalid", reason: "20 characters at most" };
  if (!pattern.test(name)) return { status: "invalid", reason: "Letters, numbers and _ only" };
  return { status: "checking" };
}
