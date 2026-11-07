import type { AppStop } from "@/components/StopStrip";

/**
 * One mapping from a refusal reason (claim_use's words) to what the screen shows, used both when the page loads
 * (app_state + quota) and when a Distill is refused mid-way, so the two can never tell different stories.
 * "hour" is not a stop: the person's own hourly limit has its own strip, with when the next use frees up.
 */
export function stopFor(reason: string, ctx: { guest: boolean; backAt: string }): AppStop | "hour" | null {
  switch (reason) {
    case "hour":
      return "hour";
    case "paused":
      return { kind: "paused", guests: false };
    case "guests_paused":
      return { kind: "paused", guests: true };
    case "daily_cap":
      return { kind: "dailyCap", backAt: ctx.backAt };
    case "day":
      return { kind: "dayLimit", backAt: ctx.backAt, guests: false };
    case "guests_day":
      return { kind: "dayLimit", backAt: ctx.backAt, guests: true };
    case "cap":
      return { kind: "monthCap" };
    case "suspended":
      return { kind: "suspended" };
    default:
      return null;
  }
}

/** The order claim_use checks in, so the page shows the same reason a press of Distill would get. */
export function firstReason(s: {
  suspended: boolean;
  allPaused: boolean;
  guestsPaused: boolean;
  guest: boolean;
  hourFull: boolean;
  dayFull: boolean;
  monthCap: boolean;
  dailyCap: boolean;
}): string | null {
  if (s.suspended) return "suspended";
  if (s.allPaused) return "paused";
  if (s.guest && s.guestsPaused) return "guests_paused";
  if (s.hourFull) return "hour";
  if (s.dayFull) return s.guest ? "guests_day" : "day";
  if (s.monthCap) return "cap";
  if (s.dailyCap) return "daily_cap";
  return null;
}
