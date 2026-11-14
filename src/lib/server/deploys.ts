import "server-only";
import { actingAs } from "@/lib/server/db";

export type PublicDeploys = { live_since: string | null; deploys: string[]; commit: string | null };

/** The public deploys feed (migration 019): the days Distill was deployed, UTC, oldest first, and the live commit. */
export async function publicDeploys(): Promise<PublicDeploys> {
  const j = await actingAs(null, async (db) => (await db.query("select public_deploys() as out")).rows[0].out);
  return { live_since: j.live_since ?? null, deploys: j.deploys ?? [], commit: j.commit ?? null };
}
