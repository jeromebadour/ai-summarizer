"use server";

import { redirect } from "next/navigation";
import { actingAs } from "@/lib/server/db";
import { text, type FormState } from "@/lib/server/rules";
import { currentUser } from "@/lib/server/session";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Deletes one of the user's own summaries (row-level security: anyone else's id deletes nothing). Limits and the
 * spend stay as they were: those live in the usage ledger, not in the summary. Then on to the next summary in the
 * list (older, else newer), or back to Saved.
 */
export async function deleteSummary(_: FormState, form: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) redirect("/login");
  const id = text(form, "id");
  if (!uuid.test(id)) return { error: "That summary doesn't exist" };
  const gone = await actingAs(user.id, async (db) => (await db.query("delete from summaries where id = $1", [id])).rowCount === 1);
  if (!gone) return { error: "That summary doesn't exist any more" };
  const next = text(form, "next");
  // Only ever back into the library: never an address taken from the form as-is.
  redirect(uuid.test(next) ? `/saved/${next}?done=deleted` : "/saved?done=deleted");
}
