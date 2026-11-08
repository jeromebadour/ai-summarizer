import "server-only";
import { connection } from "next/server";
import { actingAs } from "@/lib/server/db";

export type PublicStats = { summaries: number; words: number; figures: number; since: Date | null };

/** The About page's live totals (migrations 010 and 016): counts only, readable by anyone, nobody's data. */
export async function publicStats(): Promise<PublicStats> {
  // Live numbers are read per request, never at build time (the build has no database).
  await connection();
  const j = await actingAs(null, async (db) => (await db.query("select public_stats() as out")).rows[0].out);
  return {
    summaries: Number(j.summaries),
    words: Number(j.words),
    figures: Number(j.figures),
    since: j.since ? new Date(j.since) : null,
  };
}
