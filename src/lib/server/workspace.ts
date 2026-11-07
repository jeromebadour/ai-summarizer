import "server-only";
import type { AppStop } from "@/components/StopStrip";
import { firstReason, stopFor } from "@/lib/stops";
import { actingAs } from "./db";
import type { CurrentUser } from "./session";
import { partsIn, viewerZone } from "./zone";

/** The hour's uses for the limit strip: minutes along the last hour (0 = an hour ago, 60 = now). */
export type HourWindow = { usedAt: number[]; now: string; nextFree: string; minutesToNext: number };

export type WorkspaceState = {
  quota: { used: number; limit: number; resetsAt: string; dayUsed?: number; dayLimit?: number };
  /** Set when the hour is full. */
  hour: HourWindow | null;
  stop: AppStop | null;
};

/** What the Distill screen shows before anyone presses Distill: the quota ring, the hour strip or a stop strip. */
export async function loadWorkspace(user: CurrentUser): Promise<WorkspaceState> {
  const zone = await viewerZone();
  return actingAs(user.id, async (db) => {
    const now = new Date();
    const q = (await db.query("select * from quota_now($1)", [user.id])).rows[0];
    const app = (await db.query("select * from app_state()")).rows[0];
    const time = (d: Date) => partsIn(d, zone).time;

    const quota = user.isGuest
      ? { used: q.used_hour, limit: q.limit_hour, resetsAt: q.next_free_at ? time(q.next_free_at) : "" }
      : { used: q.used_hour, limit: q.limit_hour, resetsAt: q.next_free_at ? time(q.next_free_at) : "", dayUsed: q.used_day, dayLimit: q.limit_day };

    const reason = firstReason({
      suspended: q.suspended,
      allPaused: app.all_paused,
      guestsPaused: app.guests_paused,
      guest: user.isGuest,
      hourFull: q.used_hour >= q.limit_hour,
      dayFull: q.used_day >= q.limit_day,
      monthCap: app.month_cap_reached,
      dailyCap: app.daily_cap_reached,
    });
    const stop = reason ? stopFor(reason, { guest: user.isGuest, backAt: time(app.day_resets_at) }) : null;

    let hour: HourWindow | null = null;
    if (stop === "hour") {
      // The person's own uses still counting (refunded ones don't), placed along the last hour.
      const rows = (
        await db.query(
          `select created_at from usage_events
           where user_id = $1 and not refunded and created_at > greatest(now() - interval '1 hour', coalesce((select limit_reset_at from users), '-infinity'))
           order by created_at`,
          [user.id],
        )
      ).rows;
      const usedAt = rows.map((r) => Math.max(0, 60 - (now.getTime() - (r.created_at as Date).getTime()) / 60_000));
      const next = q.next_free_at as Date;
      hour = { usedAt, now: time(now), nextFree: time(next), minutesToNext: Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 60_000)) };
    }
    return { quota, hour, stop: stop === "hour" ? null : stop };
  });
}
