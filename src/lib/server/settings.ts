import "server-only";
import { actingAs } from "./db";

/** Whether guests can start sessions right now (neither the guests switch nor the all switch is pulled). */
export async function guestsOpen(): Promise<boolean> {
  return actingAs(null, async (db) => {
    const row = (await db.query("select guests_paused_at is null and all_paused_at is null as open from settings")).rows[0];
    return Boolean(row?.open);
  });
}
