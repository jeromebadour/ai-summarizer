import "server-only";
import { actingAs } from "@/lib/server/db";

export type PublicStats = { summaries: number; words: number; figures: number; accounts: number; since: Date | null };

/** The About page's live totals (migration 010): counts only, readable by anyone, nobody's data. */
export async function publicStats(): Promise<PublicStats> {
  const j = await actingAs(null, async (db) => (await db.query("select public_stats() as out")).rows[0].out);
  return {
    summaries: Number(j.summaries),
    words: Number(j.words),
    figures: Number(j.figures),
    accounts: Number(j.accounts),
    since: j.since ? new Date(j.since) : null,
  };
}
