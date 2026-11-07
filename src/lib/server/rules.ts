import "server-only";
import { passwordAccepted } from "@/lib/password";
import { checkUsernameFormat, normalizeUsername } from "@/lib/username";
import { uniqueViolation } from "./db";

/** A refusal for one field of a form; `code` marks one the form answers with an action. */
export type FormState = { error?: string; field?: string; code?: "email_exists" } | undefined;

export function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AccountFields = { name: string; username: string; email: string };

/** Reads and checks name, username and email: the same rules the forms show live. */
export function readAccountFields(form: FormData): { fields: AccountFields; refusal: FormState | null } {
  const fields = {
    name: text(form, "name").trim(),
    username: normalizeUsername(text(form, "username")),
    email: text(form, "email").trim().toLowerCase(),
  };
  if (fields.name.length < 1 || fields.name.length > 60) {
    return { fields, refusal: { field: "name", error: "Add a name (up to 60 characters)" } };
  }
  const format = checkUsernameFormat(fields.username);
  if (format.status === "empty") return { fields, refusal: { field: "username", error: "Choose a username" } };
  if (format.status === "invalid") return { fields, refusal: { field: "username", error: format.reason } };
  if (!emailPattern.test(fields.email) || fields.email.length > 254) {
    return { fields, refusal: { field: "email", error: "Enter a valid email" } };
  }
  return { fields, refusal: null };
}

export function newPasswordRefusal(password: string, email: string): FormState | null {
  if (password.length > 200 || !passwordAccepted(password, email)) {
    return { field: "password", error: "The password doesn't meet the rules yet" };
  }
  return null;
}

/** Turns a unique-violation on users into the form's answer, or null if it was something else. */
export function takenRefusal(error: unknown): FormState | null {
  const constraint = uniqueViolation(error);
  if (constraint === "users_username_key") return { field: "username", error: "That username is taken" };
  if (constraint === "users_email_key") {
    return { field: "email", error: "An account with this email already exists.", code: "email_exists" };
  }
  return null;
}
